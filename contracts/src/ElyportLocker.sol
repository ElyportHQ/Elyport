// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {EnumerableSet} from "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";
import {ElyportFees} from "./ElyportFees.sol";

/// @dev Minimal Uniswap-V2-style pair interface, used to verify LP locks.
interface IPairTokens {
    function token0() external view returns (address);
    function token1() external view returns (address);
}

/// @title ElyportLocker
/// @notice Time-locks ERC-20 tokens and LP tokens. A lock can be extended or topped up,
///         never shortened. Every lock is public and indexed by token and by owner. LP locks
///         are verified as V2-style pairs and also indexed under both underlying tokens, so a
///         token's page shows the liquidity locked for it.
contract ElyportLocker is ElyportFees, ReentrancyGuard {
    /// @notice Hard cap on the fee. The owner can lower or raise it, but never above this.
    uint256 public constant MAX_LOCK_FEE = 1 ether;
    using SafeERC20 for IERC20;
    using EnumerableSet for EnumerableSet.UintSet;

    struct Lock {
        address token;
        address owner;
        uint128 amount;
        uint64 unlockAt;
        uint64 createdAt;
        bool isLP;
        bool withdrawn;
    }

    /// @notice Flat fee per new lock, in native wei.
    uint256 public lockFee;

    uint256 public constant MAX_NOTE_LENGTH = 280;
    uint256 public constant MAX_LOCKS_PER_TX = 20;

    Lock[] private _locks;
    mapping(address token => uint256[]) private _locksByToken;
    mapping(address owner => EnumerableSet.UintSet) private _locksByOwner;

    error InvalidAmount();
    error InvalidUnlockTime();
    error NotLockOwner();
    error StillLocked(uint64 unlockAt);
    error AlreadyWithdrawn();
    error UnknownLock();
    error NotLPToken();
    error NoteTooLong();
    error LengthMismatch();
    error BatchTooLarge();

    event LockFeeUpdated(uint256 fee);
    event LockCreated(
        uint256 indexed id, address indexed token, address indexed owner, uint256 amount, uint64 unlockAt, bool isLP, string note
    );
    event LockExtended(uint256 indexed id, uint64 newUnlockAt);
    event LockToppedUp(uint256 indexed id, uint256 added, uint256 newAmount);
    event LockOwnerTransferred(uint256 indexed id, address indexed from, address indexed to);
    event LockWithdrawn(uint256 indexed id, address indexed to, uint256 amount);

    constructor(address initialOwner, address initialFeeRecipient, uint256 initialLockFee)
        ElyportFees(initialOwner, initialFeeRecipient)
    {
        _checkFee(initialLockFee, MAX_LOCK_FEE);
        lockFee = initialLockFee;
        emit LockFeeUpdated(initialLockFee);
    }

    function setLockFee(uint256 fee) external onlyOwner {
        _checkFee(fee, MAX_LOCK_FEE);
        lockFee = fee;
        emit LockFeeUpdated(fee);
    }

    /// @notice Fee `user` pays per lock, after any holder discount.
    function lockFeeFor(address user) external view returns (uint256) {
        return feeFor(lockFee, user);
    }

    /// @notice Locks `amount` of `token` until `unlockAt` for `lockOwner`.
    /// @dev The stored amount is the balance actually received, so fee-on-transfer tokens are handled.
    function createLock(address token, uint256 amount, uint64 unlockAt, address lockOwner, bool isLP, string calldata note)
        external
        payable
        nonReentrant
        returns (uint256 id)
    {
        uint256 fee = feeFor(lockFee, msg.sender);
        if (msg.value != fee) revert InsufficientFee(fee, msg.value);
        (address t0, address t1) = _checkCommon(token, lockOwner, isLP, note);
        if (amount == 0) revert InvalidAmount();
        if (unlockAt <= block.timestamp) revert InvalidUnlockTime();

        uint256 received = _pull(token, amount);
        if (received == 0 || received > type(uint128).max) revert InvalidAmount();
        id = _store(token, lockOwner, received, unlockAt, isLP, t0, t1, note);
        _takeFee(msg.value);
    }

    /// @notice Creates several locks of one token in one transaction, e.g. a team unlocking in tranches.
    ///         Each lock costs one lock fee. Fee-on-transfer tokens are not supported here.
    function createLocks(
        address token,
        uint256[] calldata amounts,
        uint64[] calldata unlockAts,
        address lockOwner,
        bool isLP,
        string calldata note
    ) external payable nonReentrant returns (uint256 firstId) {
        uint256 n = amounts.length;
        if (n == 0 || n != unlockAts.length) revert LengthMismatch();
        if (n > MAX_LOCKS_PER_TX) revert BatchTooLarge();
        uint256 fee = feeFor(lockFee, msg.sender) * n;
        if (msg.value != fee) revert InsufficientFee(fee, msg.value);
        (address t0, address t1) = _checkCommon(token, lockOwner, isLP, note);

        uint256 sum;
        for (uint256 i; i < n; ++i) {
            if (amounts[i] == 0 || amounts[i] > type(uint128).max) revert InvalidAmount();
            if (unlockAts[i] <= block.timestamp) revert InvalidUnlockTime();
            sum += amounts[i];
        }
        if (_pull(token, sum) != sum) revert InvalidAmount();

        firstId = _locks.length;
        for (uint256 i; i < n; ++i) {
            _store(token, lockOwner, amounts[i], unlockAts[i], isLP, t0, t1, note);
        }
        _takeFee(msg.value);
    }

    /// @notice Pushes the unlock time later. It can never move earlier.
    function extendLock(uint256 id, uint64 newUnlockAt) external {
        Lock storage l = _ownedLock(id);
        if (newUnlockAt <= l.unlockAt || newUnlockAt <= block.timestamp) revert InvalidUnlockTime();
        l.unlockAt = newUnlockAt;
        emit LockExtended(id, newUnlockAt);
    }

    /// @notice Adds more tokens to an existing lock.
    function topUp(uint256 id, uint256 amount) external nonReentrant {
        Lock storage l = _ownedLock(id);
        if (amount == 0) revert InvalidAmount();
        uint256 received = _pull(l.token, amount);
        uint256 newAmount = uint256(l.amount) + received;
        if (newAmount > type(uint128).max) revert InvalidAmount();
        l.amount = uint128(newAmount);
        emit LockToppedUp(id, received, newAmount);
    }

    function transferLockOwnership(uint256 id, address newOwner) external {
        Lock storage l = _ownedLock(id);
        if (newOwner == address(0)) revert ZeroAddress();
        address previous = l.owner;
        l.owner = newOwner;
        _locksByOwner[previous].remove(id);
        _locksByOwner[newOwner].add(id);
        emit LockOwnerTransferred(id, previous, newOwner);
    }

    /// @notice Sends the full locked amount to the lock owner once the unlock time has passed.
    function withdraw(uint256 id) external nonReentrant {
        Lock storage l = _ownedLock(id);
        if (block.timestamp < l.unlockAt) revert StillLocked(l.unlockAt);
        uint256 amount = l.amount;
        l.withdrawn = true;
        l.amount = 0;
        IERC20(l.token).safeTransfer(l.owner, amount);
        emit LockWithdrawn(id, l.owner, amount);
    }

    // ---------------------------------------------------------------- views

    function lockCount() external view returns (uint256) {
        return _locks.length;
    }

    function getLock(uint256 id) external view returns (Lock memory) {
        if (id >= _locks.length) revert UnknownLock();
        return _locks[id];
    }

    /// @notice Locks of `token` itself, plus LP locks of pairs that contain `token`.
    function lockIdsByToken(address token) external view returns (uint256[] memory) {
        return _locksByToken[token];
    }

    function lockIdsByOwner(address lockOwner) external view returns (uint256[] memory) {
        return _locksByOwner[lockOwner].values();
    }

    /// @notice Returns locks in `[start, start + limit)`, newest first when `newestFirst` is true.
    function getLocks(uint256 start, uint256 limit, bool newestFirst) external view returns (Lock[] memory page, uint256[] memory ids) {
        uint256 total = _locks.length;
        if (start >= total) return (new Lock[](0), new uint256[](0));
        uint256 n = total - start < limit ? total - start : limit;
        page = new Lock[](n);
        ids = new uint256[](n);
        for (uint256 i; i < n; ++i) {
            uint256 id = newestFirst ? total - 1 - start - i : start + i;
            page[i] = _locks[id];
            ids[i] = id;
        }
    }

    // ---------------------------------------------------------------- internal

    function _ownedLock(uint256 id) private view returns (Lock storage l) {
        if (id >= _locks.length) revert UnknownLock();
        l = _locks[id];
        if (l.owner != msg.sender) revert NotLockOwner();
        if (l.withdrawn) revert AlreadyWithdrawn();
    }

    function _checkCommon(address token, address lockOwner, bool isLP, string calldata note)
        private
        view
        returns (address t0, address t1)
    {
        if (token == address(0) || lockOwner == address(0)) revert ZeroAddress();
        if (bytes(note).length > MAX_NOTE_LENGTH) revert NoteTooLong();
        if (isLP) (t0, t1) = _pairTokens(token);
    }

    function _store(
        address token,
        address lockOwner,
        uint256 amount,
        uint64 unlockAt,
        bool isLP,
        address t0,
        address t1,
        string calldata note
    ) private returns (uint256 id) {
        id = _locks.length;
        _locks.push(
            Lock({
                token: token,
                owner: lockOwner,
                amount: uint128(amount),
                unlockAt: unlockAt,
                createdAt: uint64(block.timestamp),
                isLP: isLP,
                withdrawn: false
            })
        );
        _locksByToken[token].push(id);
        if (isLP) {
            if (t0 != token) _locksByToken[t0].push(id);
            if (t1 != token && t1 != t0) _locksByToken[t1].push(id);
        }
        _locksByOwner[lockOwner].add(id);
        emit LockCreated(id, token, lockOwner, amount, unlockAt, isLP, note);
    }

    /// @dev Reads token0/token1 from a V2-style pair; reverts with NotLPToken if it is not one.
    function _pairTokens(address pair) private view returns (address t0, address t1) {
        t0 = _readAddress(pair, IPairTokens.token0.selector);
        t1 = _readAddress(pair, IPairTokens.token1.selector);
        if (t0 == address(0) || t1 == address(0) || t0 == t1) revert NotLPToken();
    }

    function _readAddress(address target, bytes4 selector) private view returns (address a) {
        (bool ok, bytes memory data) = target.staticcall{gas: 50_000}(abi.encodeWithSelector(selector));
        if (!ok || data.length < 32) revert NotLPToken();
        uint256 word = abi.decode(data, (uint256));
        if (word > type(uint160).max) revert NotLPToken();
        a = address(uint160(word));
    }

    function _pull(address token, uint256 amount) private returns (uint256 received) {
        uint256 before = IERC20(token).balanceOf(address(this));
        IERC20(token).safeTransferFrom(msg.sender, address(this), amount);
        received = IERC20(token).balanceOf(address(this)) - before;
    }
}
