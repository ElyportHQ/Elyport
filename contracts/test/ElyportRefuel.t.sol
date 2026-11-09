// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {ElyportRefuelVault} from "../src/ElyportRefuelVault.sol";
import {ElyportRefuelDeposit} from "../src/ElyportRefuelDeposit.sol";
import {MockToken} from "./Mocks.sol";

contract ElyportRefuelTest is Test {
    ElyportRefuelVault vault;
    ElyportRefuelDeposit deposit;
    MockToken usdc;
    address owner = makeAddr("owner");
    address relayer = makeAddr("relayer");
    address user = makeAddr("user");

    function setUp() public {
        vault = new ElyportRefuelVault(owner, 1 ether, 2 ether, 50 ether);
        deposit = new ElyportRefuelDeposit(owner);
        usdc = new MockToken();
        vm.startPrank(owner);
        vault.setRelayer(relayer, true);
        deposit.setRelayer(relayer, true);
        deposit.setLimits(address(usdc), true, 1e6, 10e6);
        deposit.setLimits(address(0), true, 0.0003 ether, 0.004 ether);
        vm.stopPrank();
        vm.deal(address(vault), 10 ether);
        vm.deal(user, 1 ether);
        usdc.mint(user, 100e6);
    }

    function test_Dispense() public {
        vm.prank(relayer);
        vault.dispense(keccak256("d1"), user, 0.5 ether);
        assertEq(user.balance, 1.5 ether);
        assertTrue(vault.processed(keccak256("d1")));
    }

    function test_RevertWhen_Replayed() public {
        vm.startPrank(relayer);
        vault.dispense(keccak256("d1"), user, 0.5 ether);
        vm.expectRevert(ElyportRefuelVault.AlreadyProcessed.selector);
        vault.dispense(keccak256("d1"), user, 0.5 ether);
        vm.stopPrank();
    }

    function test_Caps() public {
        vm.startPrank(relayer);
        vm.expectRevert(ElyportRefuelVault.OverTxCap.selector);
        vault.dispense(keccak256("a"), user, 1.1 ether);
        vault.dispense(keccak256("b"), user, 1 ether);
        vault.dispense(keccak256("c"), user, 1 ether);
        vm.expectRevert(ElyportRefuelVault.OverWalletCap.selector);
        vault.dispense(keccak256("d"), user, 0.1 ether);
        vm.stopPrank();
        vm.warp(block.timestamp + 1 days);
        vm.prank(relayer);
        vault.dispense(keccak256("e"), user, 1 ether);
    }

    function test_RevertWhen_NotRelayer() public {
        vm.prank(user);
        vm.expectRevert(ElyportRefuelVault.NotRelayer.selector);
        vault.dispense(keccak256("x"), user, 0.1 ether);
    }

    function test_PauseBlocksDispense() public {
        vm.prank(owner);
        vault.pause();
        vm.prank(relayer);
        vm.expectRevert();
        vault.dispense(keccak256("x"), user, 0.1 ether);
    }

    function test_DepositTokenAndFulfil() public {
        vm.startPrank(user);
        usdc.approve(address(deposit), 5e6);
        uint256 id = deposit.depositToken(address(usdc), 5e6, user);
        vm.stopPrank();
        assertEq(uint8(deposit.getDeposit(id).status), uint8(ElyportRefuelDeposit.Status.Pending));

        uint256[] memory ids = new uint256[](1);
        ids[0] = id;
        bytes32[] memory txs = new bytes32[](1);
        vm.prank(relayer);
        deposit.markFulfilled(ids, txs);
        assertEq(uint8(deposit.getDeposit(id).status), uint8(ElyportRefuelDeposit.Status.Fulfilled));

        vm.prank(relayer);
        vm.expectRevert(ElyportRefuelDeposit.NotPending.selector);
        deposit.refund(id);
    }

    function test_DepositNativeAndRefund() public {
        vm.prank(user);
        uint256 id = deposit.depositNative{value: 0.002 ether}(user);
        uint256 before = user.balance;
        vm.prank(relayer);
        deposit.refund(id);
        assertEq(user.balance - before, 0.002 ether);
    }

    function test_RevertWhen_OutOfRange() public {
        vm.prank(user);
        vm.expectRevert(abi.encodeWithSelector(ElyportRefuelDeposit.OutOfRange.selector, 0.0003 ether, 0.004 ether));
        deposit.depositNative{value: 0.01 ether}(user);
    }

    function test_SweepCannotTouchPending() public {
        vm.startPrank(user);
        usdc.approve(address(deposit), 10e6);
        uint256 a = deposit.depositToken(address(usdc), 5e6, user);
        deposit.depositToken(address(usdc), 4e6, user);
        vm.stopPrank();

        vm.prank(owner);
        vm.expectRevert(abi.encodeWithSelector(ElyportRefuelDeposit.ExceedsFreeBalance.selector, 0));
        deposit.sweep(address(usdc), owner, 1);

        uint256[] memory ids = new uint256[](1);
        ids[0] = a;
        vm.prank(relayer);
        deposit.markFulfilled(ids, new bytes32[](1));

        vm.prank(owner);
        deposit.sweep(address(usdc), owner, 5e6);
        assertEq(usdc.balanceOf(owner), 5e6);
        assertEq(deposit.reserved(address(usdc)), 4e6);
    }
}

