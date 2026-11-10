// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {ElyportDrop} from "../src/ElyportDrop.sol";
import {MockToken, RejectEther} from "./Mocks.sol";

contract ElyportDropTest is Test {
    ElyportDrop drop;
    MockToken token;
    address owner = makeAddr("owner");
    address treasury = makeAddr("treasury");
    address sender = makeAddr("sender");
    uint256 constant FEE = 0.07 ether;

    function setUp() public {
        drop = new ElyportDrop(owner, treasury, FEE);
        token = new MockToken();
        token.mint(sender, 1_000 ether);
        vm.deal(sender, 100 ether);
    }

    function _list(uint256 n) internal returns (address[] memory r, uint256[] memory a) {
        r = new address[](n);
        a = new uint256[](n);
        for (uint256 i; i < n; ++i) {
            r[i] = makeAddr(string(abi.encodePacked("r", vm.toString(i))));
            a[i] = 0.1 ether;
        }
    }

    function test_DropNative() public {
        (address[] memory r, uint256[] memory a) = _list(5);
        vm.prank(sender);
        drop.dropNative{value: 0.5 ether + FEE}(r, a);
        for (uint256 i; i < 5; ++i) {
            assertEq(r[i].balance, 0.1 ether);
        }
        assertEq(treasury.balance, FEE);
    }

    function test_DropNativeRefundsRejected() public {
        (address[] memory r, uint256[] memory a) = _list(3);
        r[1] = address(new RejectEther());
        uint256 before = sender.balance;
        vm.prank(sender);
        drop.dropNative{value: 0.3 ether + FEE}(r, a);
        assertEq(before - sender.balance, 0.2 ether + FEE);
        assertEq(address(drop).balance, 0);
    }

    function test_RevertWhen_WrongValue() public {
        (address[] memory r, uint256[] memory a) = _list(2);
        vm.prank(sender);
        vm.expectRevert();
        drop.dropNative{value: 0.2 ether}(r, a);
    }

    function test_DropToken() public {
        (address[] memory r, uint256[] memory a) = _list(4);
        vm.startPrank(sender);
        token.approve(address(drop), 0.4 ether);
        drop.dropToken{value: FEE}(address(token), r, a);
        vm.stopPrank();
        assertEq(token.balanceOf(r[3]), 0.1 ether);
        assertEq(token.balanceOf(address(drop)), 0);
    }

    function test_RevertWhen_TooMany() public {
        (address[] memory r, uint256[] memory a) = _list(501);
        vm.prank(sender);
        vm.expectRevert(ElyportDrop.BatchTooLarge.selector);
        drop.dropToken{value: FEE}(address(token), r, a);
    }

    function test_DropHolderDiscount() public {
        MockToken elyx = new MockToken();
        elyx.mint(sender, 500 ether);
        vm.prank(owner);
        drop.setDiscount(address(elyx), 500 ether, 2_500); // 25% off
        uint256 fee = drop.dropFeeFor(sender);
        assertEq(fee, (FEE * 7_500) / 10_000);
        (address[] memory r, uint256[] memory a) = _list(2);
        vm.prank(sender);
        drop.dropNative{value: 0.2 ether + fee}(r, a);
        assertEq(treasury.balance, fee);
    }
}

