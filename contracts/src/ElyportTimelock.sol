// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {TimelockController} from "@openzeppelin/contracts/governance/TimelockController.sol";

/// @title Elyport timelock
/// @notice Owns the Locker, Vesting, Gas Drop and LP checker. Every owner action (fee changes,
/// fee recipient, holder discount, DEX list) must be scheduled publicly and can only run after
/// MIN_DELAY. The proposer can cancel a scheduled action during the delay. Once the delay has
/// passed, anyone can execute it. Nobody can shorten the delay without waiting the delay itself.
contract ElyportTimelock is TimelockController {
    uint256 public constant MIN_DELAY = 48 hours;

    constructor(address proposer) TimelockController(MIN_DELAY, _one(proposer), _one(address(0)), address(0)) {}

    function _one(address a) private pure returns (address[] memory list) {
        list = new address[](1);
        list[0] = a;
    }
}
