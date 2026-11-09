// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {ElyportFees} from "./ElyportFees.sol";

/// @title ElyportDrop
/// @notice Gas Drop: sends native HYPE or any ERC-20 to many wallets in one transaction.
///         Tokens move straight from the sender to each recipient; native sends that a
///         recipient rejects are refunded to the sender instead of failing the batch.
contract ElyportDrop is ElyportFees, ReentrancyGuard {
    using SafeERC20 for IERC20;

    uint256 public constant MAX_RECIPIENTS = 500;

    /// @notice Flat fee per batch, in native wei.
    uint256 public dropFee;

    error LengthMismatch();
    error BatchTooLarge();
    error EmptyBatch();
    error RefundFailed();

    event DropFeeUpdated(uint256 fee);
    event Dropped(address indexed sender, address indexed token, uint256 recipients, uint256 total);
    event NativeSendFailed(address indexed recipient, uint256 amount);

    constructor(address initialOwner, address initialFeeRecipient, uint256 initialDropFee)
        ElyportFees(initialOwner, initialFeeRecipient)
    {
        dropFee = initialDropFee;
        emit DropFeeUpdated(initialDropFee);
    }

    function setDropFee(uint256 fee) external onlyOwner {
        dropFee = fee;
        emit DropFeeUpdated(fee);
    }

    /// @notice Sends native HYPE. `msg.value` must equal the sum of `amounts` plus `dropFee`.
    function dropNative(address[] calldata recipients, uint256[] calldata amounts) external payable nonReentrant {
        uint256 n = _check(recipients, amounts);
        uint256 total;
        for (uint256 i; i < n; ++i) {
            total += amounts[i];
        }
        if (msg.value != total + dropFee) revert InsufficientFee(total + dropFee, msg.value);

        uint256 failed;
        for (uint256 i; i < n; ++i) {
            if (recipients[i] == address(0)) revert ZeroAddress();
            // Gas-capped so a malicious recipient cannot grief the whole batch.
            (bool ok,) = recipients[i].call{value: amounts[i], gas: 30_000}("");
            if (!ok) {
                failed += amounts[i];
                emit NativeSendFailed(recipients[i], amounts[i]);
            }
        }
        if (failed > 0) {
            (bool refunded,) = msg.sender.call{value: failed}("");
            if (!refunded) revert RefundFailed();
        }

        _takeFee(dropFee);
        emit Dropped(msg.sender, address(0), n, total - failed);
    }

    /// @notice Sends an ERC-20 from the caller to each recipient. Needs prior approval of the total.
    function dropToken(address token, address[] calldata recipients, uint256[] calldata amounts) external payable nonReentrant {
        if (msg.value != dropFee) revert InsufficientFee(dropFee, msg.value);
        if (token == address(0)) revert ZeroAddress();
        uint256 n = _check(recipients, amounts);
        uint256 total;
        IERC20 t = IERC20(token);
        for (uint256 i; i < n; ++i) {
            if (recipients[i] == address(0)) revert ZeroAddress();
            t.safeTransferFrom(msg.sender, recipients[i], amounts[i]);
            total += amounts[i];
        }
        _takeFee(dropFee);
        emit Dropped(msg.sender, token, n, total);
    }

    function _check(address[] calldata recipients, uint256[] calldata amounts) private pure returns (uint256 n) {
        n = recipients.length;
        if (n == 0) revert EmptyBatch();
        if (n != amounts.length) revert LengthMismatch();
        if (n > MAX_RECIPIENTS) revert BatchTooLarge();
    }
}
