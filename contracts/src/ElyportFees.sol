// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {Ownable2Step} from "@openzeppelin/contracts/access/Ownable2Step.sol";

/// @title ElyportFees
/// @notice Shared flat-fee logic. Fees are paid in the chain's native token (HYPE on Elysium)
///         and forwarded straight to `feeRecipient`, so the tool contracts never custody fees.
///         Holders of `discountToken` (at least `discountMinBalance`) pay `discountBps` less.
abstract contract ElyportFees is Ownable2Step {
    address public feeRecipient;

    /// @notice Token whose holders get a fee discount. address(0) = no discount.
    address public discountToken;
    uint256 public discountMinBalance;
    /// @notice Discount in basis points (2500 = 25% off).
    uint16 public discountBps;

    error InsufficientFee(uint256 required, uint256 provided);
    error FeeTransferFailed();
    error ZeroAddress();
    error InvalidDiscount();
    error FeeTooHigh(uint256 max);

    event FeeRecipientUpdated(address indexed feeRecipient);
    event FeePaid(address indexed payer, uint256 amount);
    event DiscountUpdated(address indexed token, uint256 minBalance, uint16 bps);

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

    /// @notice Sets the holder discount. Use token = address(0) or bps = 0 to switch it off.
    function setDiscount(address token, uint256 minBalance, uint16 bps) external onlyOwner {
        if (bps > 10_000) revert InvalidDiscount();
        discountToken = token;
        discountMinBalance = minBalance;
        discountBps = bps;
        emit DiscountUpdated(token, minBalance, bps);
    }

    /// @notice The fee `user` pays for a base fee, after any holder discount.
    function feeFor(uint256 baseFee, address user) public view returns (uint256) {
        address t = discountToken;
        if (t == address(0) || discountBps == 0 || baseFee == 0) return baseFee;
        (bool ok, bytes memory data) = t.staticcall{gas: 50_000}(abi.encodeWithSelector(0x70a08231, user));
        if (!ok || data.length < 32 || abi.decode(data, (uint256)) < discountMinBalance) return baseFee;
        return (baseFee * (10_000 - discountBps)) / 10_000;
    }

    /// @dev Reverts when a fee is above the contract's hard cap, so a fee can never be raised without limit.
    function _checkFee(uint256 fee, uint256 cap) internal pure {
        if (fee > cap) revert FeeTooHigh(cap);
    }

    /// @dev Takes exactly `fee` out of the native value sent with the call and forwards it.
    function _takeFee(uint256 fee) internal {
        if (fee == 0) return;
        (bool ok,) = feeRecipient.call{value: fee}("");
        if (!ok) revert FeeTransferFailed();
        emit FeePaid(msg.sender, fee);
    }
}
