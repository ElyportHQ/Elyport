// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {Ownable2Step} from "@openzeppelin/contracts/access/Ownable2Step.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/// @title ElyportRefuelDeposit
/// @notice Deployed on each source chain (Ethereum, Base, Arbitrum, BNB Chain, HyperEVM).
///         Users pay here; the relayer sees the `Deposited` event and sends HYPE on Elysium
///         from the RefuelVault. Deposits stay refundable until the relayer marks them done.
contract ElyportRefuelDeposit is Ownable2Step, Pausable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    enum Status {
        None,
        Pending,
        Fulfilled,
        Refunded
    }

    struct Deposit {
        address sender;
        address recipient; // wallet on Elysium
        address token; // address(0) = native
        uint256 amount;
        uint64 createdAt;
        Status status;
    }

    struct TokenLimits {
        bool allowed;
        uint256 min;
        uint256 max;
    }

    /// @dev address(0) holds the limits for the chain's native token.
    mapping(address token => TokenLimits) public limits;
    mapping(address => bool) public isRelayer;
    /// @notice Funds owed to pending deposits, per token. Sweeps can never touch them.
    mapping(address token => uint256) public reserved;
    Deposit[] private _deposits;

    error NotRelayer();
    error TokenNotAllowed();
    error OutOfRange(uint256 min, uint256 max);
    error ZeroAddress();
    error NotPending();
    error TransferFailed();
    error UnknownDeposit();
    error ExceedsFreeBalance(uint256 free);

    event Deposited(
        uint256 indexed id, address indexed sender, address indexed recipient, address token, uint256 amount
    );
    event Fulfilled(uint256 indexed id, bytes32 elysiumTx);
    event Refunded(uint256 indexed id, address indexed to, uint256 amount);
    event LimitsSet(address indexed token, bool allowed, uint256 min, uint256 max);
    event RelayerSet(address indexed relayer, bool allowed);

    constructor(address initialOwner) Ownable(initialOwner) {}

    function depositNative(address recipient) external payable whenNotPaused returns (uint256 id) {
        id = _record(recipient, address(0), msg.value);
    }

    /// @dev Only plain ERC-20s (e.g. USDC) should be allowed; the amount must arrive in full.
    function depositToken(address token, uint256 amount, address recipient)
        external
        whenNotPaused
        nonReentrant
        returns (uint256 id)
    {
        if (token == address(0)) revert TokenNotAllowed();
        uint256 before = IERC20(token).balanceOf(address(this));
        IERC20(token).safeTransferFrom(msg.sender, address(this), amount);
        uint256 received = IERC20(token).balanceOf(address(this)) - before;
        id = _record(recipient, token, received);
    }

    // ---------------------------------------------------------------- relayer

    function markFulfilled(uint256[] calldata ids, bytes32[] calldata elysiumTxs) external {
        if (!isRelayer[msg.sender]) revert NotRelayer();
        for (uint256 i; i < ids.length; ++i) {
            Deposit storage d = _get(ids[i]);
            if (d.status != Status.Pending) revert NotPending();
            d.status = Status.Fulfilled;
            reserved[d.token] -= d.amount;
            emit Fulfilled(ids[i], i < elysiumTxs.length ? elysiumTxs[i] : bytes32(0));
        }
    }

    /// @notice Returns a pending deposit to its sender (e.g. vault empty or wallet over its cap).
    function refund(uint256 id) external nonReentrant {
        if (!isRelayer[msg.sender] && msg.sender != owner()) revert NotRelayer();
        Deposit storage d = _get(id);
        if (d.status != Status.Pending) revert NotPending();
        d.status = Status.Refunded;
        reserved[d.token] -= d.amount;
        _send(d.token, d.sender, d.amount);
        emit Refunded(id, d.sender, d.amount);
    }

    // ---------------------------------------------------------------- views

    function depositCount() external view returns (uint256) {
        return _deposits.length;
    }

    function getDeposit(uint256 id) external view returns (Deposit memory) {
        return _get(id);
    }

    // ---------------------------------------------------------------- admin

    function setLimits(address token, bool allowed, uint256 min, uint256 max) external onlyOwner {
        limits[token] = TokenLimits(allowed, min, max);
        emit LimitsSet(token, allowed, min, max);
    }

    function setRelayer(address relayer, bool allowed) external onlyOwner {
        if (relayer == address(0)) revert ZeroAddress();
        isRelayer[relayer] = allowed;
        emit RelayerSet(relayer, allowed);
    }

    /// @notice Moves collected funds to the treasury (used to restock HYPE on Elysium).
    ///         Only fulfilled funds can leave: pending deposits stay fully refundable.
    function sweep(address token, address to, uint256 amount) external onlyOwner nonReentrant {
        if (to == address(0)) revert ZeroAddress();
        uint256 bal = token == address(0) ? address(this).balance : IERC20(token).balanceOf(address(this));
        uint256 free = bal > reserved[token] ? bal - reserved[token] : 0;
        if (amount > free) revert ExceedsFreeBalance(free);
        _send(token, to, amount);
    }

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }

    // ---------------------------------------------------------------- internal

    function _record(address recipient, address token, uint256 amount) private returns (uint256 id) {
        if (recipient == address(0)) revert ZeroAddress();
        TokenLimits memory l = limits[token];
        if (!l.allowed) revert TokenNotAllowed();
        if (amount < l.min || amount > l.max) revert OutOfRange(l.min, l.max);
        id = _deposits.length;
        _deposits.push(Deposit(msg.sender, recipient, token, amount, uint64(block.timestamp), Status.Pending));
        reserved[token] += amount;
        emit Deposited(id, msg.sender, recipient, token, amount);
    }

    function _send(address token, address to, uint256 amount) private {
        if (token == address(0)) {
            (bool ok,) = to.call{value: amount}("");
            if (!ok) revert TransferFailed();
        } else {
            IERC20(token).safeTransfer(to, amount);
        }
    }

    function _get(uint256 id) private view returns (Deposit storage) {
        if (id >= _deposits.length) revert UnknownDeposit();
        return _deposits[id];
    }
}
