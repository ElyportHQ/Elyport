// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {Ownable2Step} from "@openzeppelin/contracts/access/Ownable2Step.sol";

/// @title ElyportFees
/// @notice Shared flat-fee logic. Fees are paid in the chain's native token (HYPE on Elysium)
///         and forwarded straight to `feeRecipient`, so the tool contracts never custody fees.
abstract contract ElyportFees is Ownable2Step {
    address public feeRecipient;

    error InsufficientFee(uint256 required, uint256 provided);
    error FeeTransferFailed();
    error ZeroAddress();

    event FeeRecipientUpdated(address indexed feeRecipient);
    event FeePaid(address indexed payer, uint256 amount);

    constructor(address initialOwner, address initialFeeRecipient) Ownable(initialOwner) {
        if (initialFeeRecipient == address(0)) revert ZeroAddress();
        feeRecipient = initialFeeRecipient;
        emit FeeRecipientUpdated(initialFeeRecipient);
    }

    function setFeeRecipient(address newFeeRecipient) external onlyOwner {
        if (newFeeRecipient == address(0)) revert ZeroAddress();
        feeRecipient = newFeeRecipient;
        emit FeeRecipientUpdated(newFeeRecipient);
    }

    /// @dev Takes exactly `fee` out of the native value sent with the call and forwards it.
    function _takeFee(uint256 fee) internal {
        if (fee == 0) return;
        (bool ok,) = feeRecipient.call{value: fee}("");
        if (!ok) revert FeeTransferFailed();
        emit FeePaid(msg.sender, fee);
    }
}
