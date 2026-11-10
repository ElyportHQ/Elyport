// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {Ownable, Ownable2Step} from "@openzeppelin/contracts/access/Ownable2Step.sol";

interface ILockerView {
    struct Lock {
        address token;
        address owner;
        uint128 amount;
        uint64 unlockAt;
        uint64 createdAt;
        bool isLP;
        bool withdrawn;
    }

    function getLock(uint256 id) external view returns (Lock memory);
}

/// @title ElyportLPCheck
/// @notice Read-only helper that tells whether an "LP" token is a real pair from a known DEX.
///         The Locker accepts any contract that looks like a pair; anyone (explorers, bots, other apps)
///         can call this to see whether a locked LP token really is liquidity. It holds no funds and
///         cannot change any lock.
/// @dev A pair is verified when its `factory()` is on the list AND that factory's `getPair(token0, token1)`
///      returns the same pair. A fake pair would need the real factory to vouch for it, which it can't.
contract ElyportLPCheck is Ownable2Step {
    struct Dex {
        string name;
        bool active;
    }

    ILockerView public immutable locker;
    mapping(address factory => Dex) public dexOf;
    address[] private _factories;

    event DexSet(address indexed factory, string name, bool active);

    error ZeroAddress();

    constructor(address initialOwner, address locker_, address factory, string memory name) Ownable(initialOwner) {
        if (locker_ == address(0)) revert ZeroAddress();
        locker = ILockerView(locker_);
        if (factory != address(0)) _setDex(factory, name, true);
    }

    /// @notice Adds, renames or switches off a DEX factory.
    function setDex(address factory, string calldata name, bool active) external onlyOwner {
        _setDex(factory, name, active);
    }

    /// @notice All factories ever added (check `dexOf` for which are active).
    function factories() external view returns (address[] memory) {
        return _factories;
    }

    /// @notice Whether `pair` is a pair from an active, known DEX factory.
    function checkPair(address pair) public view returns (bool verified, string memory dexName, address factory) {
        factory = _readAddress(pair, 0xc45a0155); // factory()
        Dex storage d = dexOf[factory];
        if (factory == address(0) || !d.active) return (false, "", factory);
        address t0 = _readAddress(pair, 0x0dfe1681); // token0()
        address t1 = _readAddress(pair, 0xd21220a7); // token1()
        if (t0 == address(0) || t1 == address(0)) return (false, "", factory);
        address got = _readAddressWithArgs(factory, abi.encodeWithSelector(0xe6a43905, t0, t1)); // getPair(t0, t1)
        if (got != pair) return (false, "", factory);
        return (true, d.name, factory);
    }

    /// @notice Checks an Elyport lock. `verified` is only true for active LP locks of a known DEX pair.
    function checkLock(uint256 id) external view returns (bool isLP, bool verified, string memory dexName, address pair) {
        ILockerView.Lock memory l = locker.getLock(id);
        pair = l.token;
        isLP = l.isLP;
        if (!isLP) return (false, false, "", pair);
        (verified, dexName,) = checkPair(pair);
    }

    function _setDex(address factory, string memory name, bool active) private {
        if (factory == address(0)) revert ZeroAddress();
        if (bytes(dexOf[factory].name).length == 0) _factories.push(factory);
        dexOf[factory] = Dex(name, active);
        emit DexSet(factory, name, active);
    }

    function _readAddress(address target, bytes4 selector) private view returns (address) {
        return _readAddressWithArgs(target, abi.encodeWithSelector(selector));
    }

    /// @dev Gas-capped static call; any failure or non-address result reads as address(0).
    function _readAddressWithArgs(address target, bytes memory data) private view returns (address a) {
        if (target.code.length == 0) return address(0);
        (bool ok, bytes memory ret) = target.staticcall{gas: 60_000}(data);
        if (!ok || ret.length < 32) return address(0);
        uint256 word = abi.decode(ret, (uint256));
        if (word > type(uint160).max) return address(0);
        a = address(uint160(word));
    }
}
