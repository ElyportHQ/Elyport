// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {ElyportLocker} from "../src/ElyportLocker.sol";
import {ElyportFees} from "../src/ElyportFees.sol";
import {MockToken, TaxToken, MockPair} from "./Mocks.sol";

contract ElyportLockerTest is Test {
    ElyportLocker locker;
    MockToken token;
    address owner = makeAddr("owner");
    address treasury = makeAddr("treasury");
    address alice = makeAddr("alice");
    address bob = makeAddr("bob");
    uint256 constant FEE = 0.25 ether;

    function setUp() public {
        locker = new ElyportLocker(owner, treasury, FEE);
        token = new MockToken();
        token.mint(alice, 1_000 ether);
        vm.deal(alice, 10 ether);
        vm.prank(alice);
        token.approve(address(locker), type(uint256).max);
    }

    function _lock(uint64 unlockAt) internal returns (uint256) {
        vm.prank(alice);
        return locker.createLock{value: FEE}(address(token), 100 ether, unlockAt, alice, false, "launch");
    }

    function test_CreateLock() public {
        uint64 unlockAt = uint64(block.timestamp + 30 days);
        uint256 id = _lock(unlockAt);
        ElyportLocker.Lock memory l = locker.getLock(id);
        assertEq(l.amount, 100 ether);
        assertEq(l.owner, alice);
        assertEq(l.unlockAt, unlockAt);
        assertFalse(l.isLP);
        assertEq(token.balanceOf(address(locker)), 100 ether);
        assertEq(treasury.balance, FEE);
        assertEq(locker.lockIdsByToken(address(token)).length, 1);
        assertEq(locker.lockIdsByOwner(alice).length, 1);
    }

    function test_RevertWhen_WrongFee() public {
        vm.prank(alice);
        vm.expectRevert(abi.encodeWithSelector(ElyportFees.InsufficientFee.selector, FEE, 0));
        locker.createLock(address(token), 1 ether, uint64(block.timestamp + 1 days), alice, false, "");
    }

    function test_RevertWhen_UnlockInPast() public {
        vm.prank(alice);
        vm.expectRevert(ElyportLocker.InvalidUnlockTime.selector);
        locker.createLock{value: FEE}(address(token), 1 ether, uint64(block.timestamp), alice, false, "");
    }

    function test_CannotWithdrawEarly() public {
        uint256 id = _lock(uint64(block.timestamp + 30 days));
        vm.prank(alice);
        vm.expectRevert();
        locker.withdraw(id);
    }

    function test_WithdrawAfterUnlock() public {
        uint256 id = _lock(uint64(block.timestamp + 30 days));
        vm.warp(block.timestamp + 30 days);
        vm.prank(alice);
        locker.withdraw(id);
        assertEq(token.balanceOf(alice), 1_000 ether);
        assertTrue(locker.getLock(id).withdrawn);
        vm.prank(alice);
        vm.expectRevert(ElyportLocker.AlreadyWithdrawn.selector);
        locker.withdraw(id);
    }

    function test_ExtendOnlyLater() public {
        uint64 unlockAt = uint64(block.timestamp + 30 days);
        uint256 id = _lock(unlockAt);
        vm.startPrank(alice);
        vm.expectRevert(ElyportLocker.InvalidUnlockTime.selector);
        locker.extendLock(id, unlockAt - 1);
        locker.extendLock(id, unlockAt + 1 days);
        vm.stopPrank();
        assertEq(locker.getLock(id).unlockAt, unlockAt + 1 days);
    }

    function test_OnlyOwnerCanManage() public {
        uint256 id = _lock(uint64(block.timestamp + 30 days));
        vm.prank(bob);
        vm.expectRevert(ElyportLocker.NotLockOwner.selector);
        locker.extendLock(id, uint64(block.timestamp + 60 days));
    }

    function test_TopUpAndTransfer() public {
        uint256 id = _lock(uint64(block.timestamp + 30 days));
        vm.startPrank(alice);
        locker.topUp(id, 50 ether);
        locker.transferLockOwnership(id, bob);
        vm.stopPrank();
        assertEq(locker.getLock(id).amount, 150 ether);
        assertEq(locker.lockIdsByOwner(alice).length, 0);
        assertEq(locker.lockIdsByOwner(bob)[0], id);
        vm.warp(block.timestamp + 31 days);
        vm.prank(bob);
        locker.withdraw(id);
        assertEq(token.balanceOf(bob), 150 ether);
    }

    function test_FeeOnTransferStoresReceived() public {
        TaxToken tax = new TaxToken();
        tax.mint(alice, 100 ether);
        vm.startPrank(alice);
        tax.approve(address(locker), type(uint256).max);
        uint256 id = locker.createLock{value: FEE}(address(tax), 100 ether, uint64(block.timestamp + 1 days), alice, false, "");
        vm.stopPrank();
        assertEq(locker.getLock(id).amount, 99 ether);
    }

    function test_Pagination() public {
        for (uint256 i; i < 3; ++i) {
            _lock(uint64(block.timestamp + 1 days + i));
        }
        (ElyportLocker.Lock[] memory page, uint256[] memory ids) = locker.getLocks(0, 2, true);
        assertEq(page.length, 2);
        assertEq(ids[0], 2);
        assertEq(ids[1], 1);
    }

    function test_AdminSetsFee() public {
        vm.prank(owner);
        locker.setLockFee(1 ether);
        assertEq(locker.lockFee(), 1 ether);
        vm.prank(alice);
        vm.expectRevert();
        locker.setLockFee(0);
    }

    function test_LPLockIndexedUnderBothTokens() public {
        MockToken weth = new MockToken();
        MockPair pair = new MockPair(address(token), address(weth));
        pair.mint(alice, 50 ether);
        vm.startPrank(alice);
        pair.approve(address(locker), type(uint256).max);
        uint256 id = locker.createLock{value: FEE}(address(pair), 50 ether, uint64(block.timestamp + 1 days), alice, true, "");
        vm.stopPrank();

        assertTrue(locker.getLock(id).isLP);
        assertEq(locker.lockIdsByToken(address(pair))[0], id);
        assertEq(locker.lockIdsByToken(address(token))[0], id);
        assertEq(locker.lockIdsByToken(address(weth))[0], id);
    }

    function test_RevertWhen_FakeLP() public {
        vm.prank(alice);
        vm.expectRevert(ElyportLocker.NotLPToken.selector);
        locker.createLock{value: FEE}(address(token), 1 ether, uint64(block.timestamp + 1 days), alice, true, "");
    }

    function test_RevertWhen_NoteTooLong() public {
        bytes memory longNote = new bytes(281);
        vm.prank(alice);
        vm.expectRevert(ElyportLocker.NoteTooLong.selector);
        locker.createLock{value: FEE}(address(token), 1 ether, uint64(block.timestamp + 1 days), alice, false, string(longNote));
    }

    function test_ExtendMustBeInFuture() public {
        uint256 id = _lock(uint64(block.timestamp + 1 days));
        vm.warp(block.timestamp + 10 days);
        vm.prank(alice);
        vm.expectRevert(ElyportLocker.InvalidUnlockTime.selector);
        locker.extendLock(id, uint64(block.timestamp - 1));
    }
}
