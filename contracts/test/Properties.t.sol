// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {ElyportVesting} from "../src/ElyportVesting.sol";
import {ElyportLocker} from "../src/ElyportLocker.sol";
import {ElyportRefuelDeposit} from "../src/ElyportRefuelDeposit.sol";
import {MockToken} from "./Mocks.sol";

/// @notice Fuzzed properties that must hold for any input, written for the internal security review.
contract PropertiesTest is Test {
    MockToken token;
    address owner = makeAddr("owner");
    address treasury = makeAddr("treasury");
    address alice = makeAddr("alice");

    function setUp() public {
        token = new MockToken();
    }

    /// Vested amount never decreases over time, never exceeds the total, is 0 before the cliff and the total at the end.
    function testFuzz_VestingCurve(uint128 total, uint64 cliff, uint64 duration, uint64 period, uint32 dt1, uint32 dt2) public {
        total = uint128(bound(total, 1, 1e30));
        duration = uint64(bound(duration, 1, 3650 days));
        cliff = uint64(bound(cliff, 0, duration));
        period = uint64(bound(period, 1, duration));
        ElyportVesting v = new ElyportVesting(owner, treasury, 0);
        token.mint(address(this), total);
        token.approve(address(v), total);
        address[] memory b = new address[](1);
        b[0] = alice;
        uint256[] memory a = new uint256[](1);
        a[0] = total;
        uint64 start = uint64(block.timestamp);
        uint256 id = v.createSchedules(address(token), b, a, start, cliff, duration, period, false);

        uint64 t1 = start + uint64(dt1);
        uint64 t2 = t1 + uint64(dt2);
        uint256 v1 = v.vestedAmount(id, t1);
        uint256 v2 = v.vestedAmount(id, t2);
        assertLe(v1, v2, "monotonic");
        assertLe(v2, total, "bounded");
        if (cliff > 0) assertEq(v.vestedAmount(id, start + cliff - 1), 0, "nothing before cliff");
        assertEq(v.vestedAmount(id, start + duration), total, "all at the end");
    }

    /// Claims over time pay out exactly the total, never more, and the contract stays solvent.
    function testFuzz_VestingClaimsSumToTotal(uint128 total, uint8 steps) public {
        total = uint128(bound(total, 1, 1e30));
        steps = uint8(bound(steps, 1, 30));
        ElyportVesting v = new ElyportVesting(owner, treasury, 0);
        token.mint(address(this), total);
        token.approve(address(v), total);
        address[] memory b = new address[](1);
        b[0] = alice;
        uint256[] memory a = new uint256[](1);
        a[0] = total;
        uint256 id = v.createSchedules(address(token), b, a, uint64(block.timestamp), 0, 360 days, 30 days, false);
        for (uint256 i; i < steps; ++i) {
            vm.warp(block.timestamp + 400 days / steps);
            if (v.claimable(id) > 0) v.claim(id);
        }
        vm.warp(block.timestamp + 400 days);
        if (v.claimable(id) > 0) v.claim(id);
        assertEq(token.balanceOf(alice), total);
        assertEq(token.balanceOf(address(v)), 0);
    }

    /// The Locker always holds exactly the sum of its active locks.
    function testFuzz_LockerSolvent(uint96[5] memory amounts, uint8 withdrawMask) public {
        ElyportLocker l = new ElyportLocker(owner, treasury, 0);
        token.mint(address(this), 1e40);
        token.approve(address(l), type(uint256).max);
        uint64 unlockAt = uint64(block.timestamp + 1 days);
        for (uint256 i; i < 5; ++i) {
            l.createLock(address(token), uint256(amounts[i]) + 1, unlockAt, address(this), false, "");
        }
        vm.warp(unlockAt);
        uint256 active;
        for (uint256 i; i < 5; ++i) {
            if (withdrawMask & (1 << i) != 0) l.withdraw(i);
            else active += uint256(amounts[i]) + 1;
        }
        assertEq(token.balanceOf(address(l)), active);
    }

    /// Refuel deposits: `reserved` always equals the sum of pending deposits, however they end.
    function testFuzz_DepositReservedMatchesPending(uint8 n, uint256 seed) public {
        n = uint8(bound(n, 1, 20));
        address relayer = makeAddr("relayer");
        ElyportRefuelDeposit d = new ElyportRefuelDeposit(owner, relayer, 1, 1 ether, address(0), 0, 0);
        vm.deal(alice, 100 ether);
        uint256[] memory amt = new uint256[](n);
        for (uint256 i; i < n; ++i) {
            amt[i] = bound(uint256(keccak256(abi.encode(seed, i))), 1, 1 ether);
            vm.prank(alice);
            d.depositNative{value: amt[i]}(alice, 0);
        }
        vm.warp(block.timestamp + d.REFUND_DELAY());
        uint256 pending;
        for (uint256 i; i < n; ++i) {
            uint256 r = uint256(keccak256(abi.encode(seed, i, "action"))) % 4;
            if (r == 0) {
                uint256[] memory ids = new uint256[](1);
                ids[0] = i;
                vm.prank(relayer);
                d.markFulfilled(ids, new bytes32[](1));
            } else if (r == 1) {
                vm.prank(relayer);
                d.refund(i);
            } else if (r == 2) {
                vm.prank(alice);
                d.claimRefund(i);
            } else {
                pending += amt[i];
            }
        }
        assertEq(d.reserved(address(0)), pending);
    }
}
