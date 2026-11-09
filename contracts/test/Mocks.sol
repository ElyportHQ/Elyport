// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract MockToken is ERC20 {
    constructor() ERC20("Mock", "MOCK") {}

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
}

/// @dev Burns 1% on every transfer, to exercise fee-on-transfer handling.
contract TaxToken is ERC20 {
    constructor() ERC20("Tax", "TAX") {}

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }

    function _update(address from, address to, uint256 value) internal override {
        if (from != address(0) && to != address(0)) {
            uint256 burnt = value / 100;
            super._update(from, address(0), burnt);
            super._update(from, to, value - burnt);
        } else {
            super._update(from, to, value);
        }
    }
}

contract RejectEther {
    receive() external payable {
        revert("no");
    }
}

/// @dev A V2-style LP token: an ERC-20 that reports its two underlying tokens.
contract MockPair is ERC20 {
    address public token0;
    address public token1;

    constructor(address t0, address t1) ERC20("LP", "LP") {
        token0 = t0;
        token1 = t1;
    }

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
}
