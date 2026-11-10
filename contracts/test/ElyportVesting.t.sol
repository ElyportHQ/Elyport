// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {ElyportFees} from "../src/ElyportFees.sol";
import {ElyportVesting} from "../src/ElyportVesting.sol";
import {MockToken, TaxToken} from "./Mocks.sol";

contract ElyportVestingTest is Test {
    ElyportVesting vesting;
    MockToken token;
    address owner = makeAddr("owner");
    address treasury = makeAddr("treasury");
    address creator = makeAddr("creator");
    address alice = makeAddr("alice");
    address bob = makeAddr("bob");
    uint256 constant FEE = 0.25 ether;
    uint64 constant MONTH = 30 days;

    function setUp() public {
        vesting = new ElyportVesting(owner, treasury, FEE);
        token = new MockToken();
        token.mint(creator, 10_000 ether);
        vm.deal(creator, 10 ether);
        vm.prank(creator);
        token.approve(address(vesting), type(uint256).max);
    }

    function _create(uint64 cliff, uint64 duration, uint64 period, bool revocable) internal returns (uint256) {
        address[] memory b = new address[](1);
        b[0] = alice;
        uint256[] memory a = new uint256[](1);
        a[0] = 1_200 ether;
        vm.prank(creator);
        return vesting.createSchedules{value: FEE}(
            address(token), b, a, uint64(block.timestamp), cliff, duration, period, revocable
        );
    }

    function test_NothingBeforeCliff() public {
        uint256 id = _create(3 * MONTH, 12 * MONTH, MONTH, false);
        vm.warp(block.timestamp + 3 * MONTH - 1);
        assertEq(vesting.claimable(id), 0);
        vm.expectRevert(ElyportVesting.NothingToClaim.selector);
        vesting.claim(id);
    }

    function test_MonthlySteps() public {
        uint256 id = _create(3 * MONTH, 12 * MONTH, MONTH, false);
        vm.warp(block.timestamp + 3 * MONTH);
        assertEq(vesting.claimable(id), 300 ether);
        vm.warp(block.timestamp + MONTH - 1);
        assertEq(vesting.claimable(id), 300 ether);
        vm.warp(block.timestamp + 1);
        assertEq(vesting.claimable(id), 400 ether);
        vesting.claim(id);
        assertEq(token.balanceOf(alice), 400 ether);
        vm.warp(block.timestamp + 12 * MONTH);
        vesting.claim(id);
        assertEq(token.balanceOf(alice), 1_200 ether);
    }

    function test_Linear() public {
        uint256 id = _create(0, 100, 1, false);
        vm.warp(block.timestamp + 25);
        assertEq(vesting.claimable(id), 300 ether);
    }

    function test_RevokeSplitsCorrectly() public {
        uint256 id = _create(0, 12 * MONTH, MONTH, true);
        uint256 creatorBefore = token.balanceOf(creator);
        vm.warp(block.timestamp + 6 * MONTH);
        vm.prank(creator);
        vesting.revoke(id);
        assertEq(token.balanceOf(creator) - creatorBefore, 600 ether);
        vm.warp(block.timestamp + 12 * MONTH);
        vesting.claim(id);
        assertEq(token.balanceOf(alice), 600 ether);
    }

    function test_RevertWhen_NotRevocable() public {
        uint256 id = _create(0, 12 * MONTH, MONTH, false);
        vm.prank(creator);
        vm.expectRevert(ElyportVesting.NotRevocable.selector);
        vesting.revoke(id);
    }

    function test_TransferBeneficiary() public {
        uint256 id = _create(0, 100, 1, false);
        vm.prank(alice);
        vesting.transferBeneficiary(id, bob);
        vm.warp(block.timestamp + 100);
        vesting.claim(id);
        assertEq(token.balanceOf(bob), 1_200 ether);
        assertEq(vesting.scheduleIdsByBeneficiary(alice).length, 0);
    }

    function test_BatchCreate() public {
        address[] memory b = new address[](2);
        b[0] = alice;
        b[1] = bob;
        uint256[] memory a = new uint256[](2);
        a[0] = 100 ether;
        a[1] = 200 ether;
        vm.prank(creator);
        uint256 first = vesting.createSchedules{value: FEE}(address(token), b, a, uint64(block.timestamp), 0, 10, 1, false);
        assertEq(vesting.scheduleCount(), 2);
        assertEq(vesting.getSchedule(first + 1).total, 200 ether);
        assertEq(treasury.balance, FEE);
    }

    function test_RejectsFeeOnTransfer() public {
        TaxToken tax = new TaxToken();
        tax.mint(creator, 100 ether);
        address[] memory b = new address[](1);
        b[0] = alice;
        uint256[] memory a = new uint256[](1);
        a[0] = 100 ether;
        vm.startPrank(creator);
        tax.approve(address(vesting), type(uint256).max);
        vm.expectRevert(ElyportVesting.InvalidSchedule.selector);
        vesting.createSchedules{value: FEE}(address(tax), b, a, uint64(block.timestamp), 0, 10, 1, false);
        vm.stopPrank();
    }

    function test_RevertWhen_BadTiming() public {
        address[] memory b = new address[](1);
        b[0] = alice;
        uint256[] memory a = new uint256[](1);
        a[0] = 1 ether;
        vm.prank(creator);
        vm.expectRevert(ElyportVesting.InvalidSchedule.selector);
        vesting.createSchedules{value: FEE}(address(token), b, a, uint64(block.timestamp), 20, 10, 1, false);
    }

    function test_RevertWhen_StartOverflows() public {
        address[] memory b = new address[](1);
        b[0] = alice;
        uint256[] memory a = new uint256[](1);
        a[0] = 1 ether;
        vm.prank(creator);
        vm.expectRevert(ElyportVesting.InvalidSchedule.selector);
        vesting.createSchedules{value: FEE}(address(token), b, a, type(uint64).max - 5, 0, 10, 1, true);
    }

    function test_RevertWhen_BatchOverLimit() public {
        uint256 n = vesting.MAX_BATCH() + 1;
        address[] memory b = new address[](n);
        uint256[] memory a = new uint256[](n);
        for (uint256 i; i < n; ++i) {
            b[i] = address(uint160(i + 1));
            a[i] = 1 ether;
        }
        vm.prank(creator);
        vm.expectRevert(ElyportVesting.BatchTooLarge.selector);
        vesting.createSchedules{value: FEE}(address(token), b, a, uint64(block.timestamp), 0, 10, 1, false);
    }

    function test_FullBatchFitsOrbitGasLimit() public {
        uint256 n = vesting.MAX_BATCH();
        address[] memory b = new address[](n);
        uint256[] memory a = new uint256[](n);
        for (uint256 i; i < n; ++i) {
            b[i] = address(uint160(i + 1));
            a[i] = 1 ether;
        }
        vm.prank(creator);
        uint256 g = gasleft();
        vesting.createSchedules{value: FEE}(address(token), b, a, uint64(block.timestamp), 0, 10, 1, false);
        assertLt(g - gasleft(), 30_000_000);
    }

    function test_VestingHolderDiscount() public {
        MockToken elyx = new MockToken();
        elyx.mint(creator, 1 ether);
        vm.prank(owner);
        vesting.setDiscount(address(elyx), 1 ether, 10_000); // free for holders
        assertEq(vesting.vestingFeeFor(creator), 0);
        address[] memory b = new address[](1);
        b[0] = alice;
        uint256[] memory a = new uint256[](1);
        a[0] = 1 ether;
        vm.prank(creator);
        vesting.createSchedules{value: 0}(address(token), b, a, uint64(block.timestamp), 0, 10, 1, false);
        assertEq(vesting.scheduleCount(), 1);
    }

    function test_VestingFeeHasHardCap() public {
        vm.prank(owner);
        vm.expectRevert(abi.encodeWithSelector(ElyportFees.FeeTooHigh.selector, 1 ether));
        vesting.setVestingFee(1.5 ether);
    }
}
