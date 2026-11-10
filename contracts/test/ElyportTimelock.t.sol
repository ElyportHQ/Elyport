// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {Test} from "forge-std/Test.sol";
import {ElyportTimelock} from "../src/ElyportTimelock.sol";
import {ElyportLocker} from "../src/ElyportLocker.sol";

contract ElyportTimelockTest is Test {
    address owner = address(0xA11CE);
    address treasury = address(0xFEE);
    ElyportTimelock tl;
    ElyportLocker locker;

    function setUp() public {
        tl = new ElyportTimelock(owner);
        locker = new ElyportLocker(owner, treasury, 0.133 ether);
        vm.prank(owner);
        locker.transferOwnership(address(tl));
        _run(address(locker), abi.encodeWithSignature("acceptOwnership()"), bytes32("accept"));
    }

    function _schedule(address target, bytes memory data, bytes32 salt) internal {
        vm.prank(owner);
        tl.schedule(target, 0, data, bytes32(0), salt, 48 hours);
    }

    function _run(address target, bytes memory data, bytes32 salt) internal {
        _schedule(target, data, salt);
        vm.warp(block.timestamp + 48 hours);
        tl.execute(target, 0, data, bytes32(0), salt); // anyone can execute
    }

    function test_TimelockOwnsLocker() public view {
        assertEq(locker.owner(), address(tl));
        assertEq(tl.getMinDelay(), 48 hours);
    }

    function test_OwnerWalletCannotChangeFeeDirectly() public {
        vm.prank(owner);
        vm.expectRevert();
        locker.setLockFee(1 ether);
    }

    function test_FeeChangeWaits48Hours() public {
        bytes memory data = abi.encodeWithSignature("setLockFee(uint256)", 0.2 ether);
        _schedule(address(locker), data, bytes32("fee"));
        vm.warp(block.timestamp + 48 hours - 1);
        vm.expectRevert();
        tl.execute(address(locker), 0, data, bytes32(0), bytes32("fee"));
        vm.warp(block.timestamp + 1);
        tl.execute(address(locker), 0, data, bytes32(0), bytes32("fee"));
        assertEq(locker.lockFee(), 0.2 ether);
    }

    function test_CannotScheduleShorterDelay() public {
        vm.prank(owner);
        vm.expectRevert();
        tl.schedule(address(locker), 0, abi.encodeWithSignature("setLockFee(uint256)", 0.2 ether), bytes32(0), bytes32("x"), 1 hours);
    }

    function test_StrangerCannotSchedule() public {
        vm.prank(address(0xBAD));
        vm.expectRevert();
        tl.schedule(address(locker), 0, abi.encodeWithSignature("setLockFee(uint256)", 0), bytes32(0), bytes32("x"), 48 hours);
    }

    function test_ProposerCanCancel() public {
        bytes memory data = abi.encodeWithSignature("setLockFee(uint256)", 0.5 ether);
        _schedule(address(locker), data, bytes32("c"));
        bytes32 id = tl.hashOperation(address(locker), 0, data, bytes32(0), bytes32("c"));
        vm.prank(owner);
        tl.cancel(id);
        vm.warp(block.timestamp + 48 hours);
        vm.expectRevert();
        tl.execute(address(locker), 0, data, bytes32(0), bytes32("c"));
    }

    function test_FeeCapStillApplies() public {
        bytes memory data = abi.encodeWithSignature("setLockFee(uint256)", 2 ether);
        _schedule(address(locker), data, bytes32("cap"));
        vm.warp(block.timestamp + 48 hours);
        vm.expectRevert();
        tl.execute(address(locker), 0, data, bytes32(0), bytes32("cap"));
    }
}
