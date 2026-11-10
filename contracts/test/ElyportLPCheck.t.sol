// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {ElyportLocker} from "../src/ElyportLocker.sol";
import {ElyportLPCheck} from "../src/ElyportLPCheck.sol";
import {MockToken} from "./Mocks.sol";
import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract V2Factory {
    mapping(address => mapping(address => address)) public getPair;

    function create(address a, address b) external returns (V2Pair p) {
        p = new V2Pair(address(this), a, b);
        getPair[a][b] = address(p);
        getPair[b][a] = address(p);
    }
}

contract V2Pair is ERC20 {
    address public factory;
    address public token0;
    address public token1;

    constructor(address f, address a, address b) ERC20("LP", "LP") {
        factory = f;
        token0 = a;
        token1 = b;
    }

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
}

contract ElyportLPCheckTest is Test {
    ElyportLocker locker;
    ElyportLPCheck check;
    V2Factory realFactory;
    V2Factory fakeFactory;
    MockToken a;
    MockToken b;
    address owner = makeAddr("owner");

    function setUp() public {
        locker = new ElyportLocker(owner, makeAddr("treasury"), 0);
        realFactory = new V2Factory();
        fakeFactory = new V2Factory();
        check = new ElyportLPCheck(owner, address(locker), address(realFactory), "Uniswap V2");
        a = new MockToken();
        b = new MockToken();
    }

    function _lockLP(address pair) internal returns (uint256) {
        V2Pair(pair).mint(address(this), 1 ether);
        V2Pair(pair).approve(address(locker), 1 ether);
        return locker.createLock(pair, 1 ether, uint64(block.timestamp + 1 days), address(this), true, "");
    }

    function test_RealPairIsVerified() public {
        address pair = address(realFactory.create(address(a), address(b)));
        (bool ok, string memory name, address f) = check.checkPair(pair);
        assertTrue(ok);
        assertEq(name, "Uniswap V2");
        assertEq(f, address(realFactory));
        (bool isLP, bool verified,,) = check.checkLock(_lockLP(pair));
        assertTrue(isLP && verified);
    }

    function test_PairFromUnknownFactoryIsNot() public {
        address pair = address(fakeFactory.create(address(a), address(b)));
        (bool ok,,) = check.checkPair(pair);
        assertFalse(ok);
        (, bool verified,,) = check.checkLock(_lockLP(pair));
        assertFalse(verified);
    }

    function test_FakePairClaimingRealFactoryIsNot() public {
        // A pair that names the real factory, but the factory never created it.
        V2Pair fake = new V2Pair(address(realFactory), address(a), address(b));
        (bool ok,,) = check.checkPair(address(fake));
        assertFalse(ok);
    }

    function test_NonPairsAndEOAsAreNot() public {
        (bool ok,,) = check.checkPair(address(a));
        assertFalse(ok);
        (ok,,) = check.checkPair(makeAddr("eoa"));
        assertFalse(ok);
    }

    function test_TokenLockIsNotLP() public {
        a.mint(address(this), 1 ether);
        a.approve(address(locker), 1 ether);
        uint256 id = locker.createLock(address(a), 1 ether, uint64(block.timestamp + 1 days), address(this), false, "");
        (bool isLP, bool verified,,) = check.checkLock(id);
        assertFalse(isLP || verified);
    }

    function test_OwnerManagesDexList() public {
        address pair = address(fakeFactory.create(address(a), address(b)));
        vm.expectRevert();
        check.setDex(address(fakeFactory), "Other", true);
        vm.prank(owner);
        check.setDex(address(fakeFactory), "Other", true);
        (bool ok, string memory name,) = check.checkPair(pair);
        assertTrue(ok);
        assertEq(name, "Other");
        assertEq(check.factories().length, 2);
        vm.prank(owner);
        check.setDex(address(fakeFactory), "Other", false);
        (ok,,) = check.checkPair(pair);
        assertFalse(ok);
        assertEq(check.factories().length, 2);
    }
}
