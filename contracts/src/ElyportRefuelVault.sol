// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {Ownable2Step} from "@openzeppelin/contracts/access/Ownable2Step.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/// @title ElyportRefuelVault
/// @notice Lives on Elysium and holds the HYPE stock for Instant refuels. Only approved
///         relayers can dispense, each deposit can be paid once, and hard caps per
///         transaction, per wallet per day and per day overall limit the damage of a
///         compromised relayer key.
contract ElyportRefuelVault is Ownable2Step, Pausable, ReentrancyGuard {
    mapping(address => bool) public isRelayer;
    mapping(bytes32 depositKey => bool) public processed;
    mapping(address wallet => mapping(uint256 day => uint256)) public sentToWalletOnDay;
    mapping(uint256 day => uint256) public sentOnDay;

    uint256 public maxPerTx;
    uint256 public maxPerWalletPerDay;
    uint256 public maxPerDay;

    error NotRelayer();
    error AlreadyProcessed();
    error OverTxCap();
    error OverWalletCap();
    error OverDailyCap();
    error InsufficientStock();
    error TransferFailed();
    error ZeroAddress();

    event RelayerSet(address indexed relayer, bool allowed);
    event CapsUpdated(uint256 maxPerTx, uint256 maxPerWalletPerDay, uint256 maxPerDay);
    event Funded(address indexed from, uint256 amount);
    event Dispensed(bytes32 indexed depositKey, address indexed to, uint256 amount);
    event Withdrawn(address indexed to, uint256 amount);

    constructor(address initialOwner, uint256 maxPerTx_, uint256 maxPerWalletPerDay_, uint256 maxPerDay_)
        Ownable(initialOwner)
    {
        _setCaps(maxPerTx_, maxPerWalletPerDay_, maxPerDay_);
    }

    receive() external payable {
        emit Funded(msg.sender, msg.value);
    }

    /// @param depositKey keccak256(sourceChainId, depositContract, depositId) — unique per source deposit.
    function dispense(bytes32 depositKey, address to, uint256 amount) external whenNotPaused nonReentrant {
        if (!isRelayer[msg.sender]) revert NotRelayer();
        if (to == address(0)) revert ZeroAddress();
        if (processed[depositKey]) revert AlreadyProcessed();
        if (amount > maxPerTx) revert OverTxCap();
        uint256 day = block.timestamp / 1 days;
        if (sentToWalletOnDay[to][day] + amount > maxPerWalletPerDay) revert OverWalletCap();
        if (sentOnDay[day] + amount > maxPerDay) revert OverDailyCap();
        if (address(this).balance < amount) revert InsufficientStock();

        processed[depositKey] = true;
        sentToWalletOnDay[to][day] += amount;
        sentOnDay[day] += amount;

        (bool ok,) = to.call{value: amount}("");
        if (!ok) revert TransferFailed();
        emit Dispensed(depositKey, to, amount);
    }

    function stock() external view returns (uint256) {
        return address(this).balance;
    }

    // ---------------------------------------------------------------- admin

    function setRelayer(address relayer, bool allowed) external onlyOwner {
        if (relayer == address(0)) revert ZeroAddress();
        isRelayer[relayer] = allowed;
        emit RelayerSet(relayer, allowed);
    }

    function setCaps(uint256 maxPerTx_, uint256 maxPerWalletPerDay_, uint256 maxPerDay_) external onlyOwner {
        _setCaps(maxPerTx_, maxPerWalletPerDay_, maxPerDay_);
    }

    function withdraw(address payable to, uint256 amount) external onlyOwner nonReentrant {
        if (to == address(0)) revert ZeroAddress();
        (bool ok,) = to.call{value: amount}("");
        if (!ok) revert TransferFailed();
        emit Withdrawn(to, amount);
    }

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }

    function _setCaps(uint256 a, uint256 b, uint256 c) private {
        maxPerTx = a;
        maxPerWalletPerDay = b;
        maxPerDay = c;
        emit CapsUpdated(a, b, c);
    }
}
