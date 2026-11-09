// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console2} from "forge-std/Script.sol";
import {ElyportLocker} from "../src/ElyportLocker.sol";
import {ElyportVesting} from "../src/ElyportVesting.sol";
import {ElyportDrop} from "../src/ElyportDrop.sol";
import {ElyportRefuelVault} from "../src/ElyportRefuelVault.sol";
import {ElyportRefuelDeposit} from "../src/ElyportRefuelDeposit.sol";

/// @notice Deploys the Elysium-side contracts.
/// forge script script/Deploy.s.sol:DeployElysium --rpc-url $ELYSIUM_RPC_URL --broadcast --private-key $DEPLOYER_KEY
/// Env: OWNER, FEE_RECIPIENT, RELAYER, LOCK_FEE_WEI, VESTING_FEE_WEI, DROP_FEE_WEI,
///      VAULT_MAX_PER_TX_WEI, VAULT_MAX_PER_WALLET_DAY_WEI, VAULT_MAX_PER_DAY_WEI
contract DeployElysium is Script {
    function run() external {
        address owner = vm.envAddress("OWNER");
        address feeRecipient = vm.envAddress("FEE_RECIPIENT");
        address relayer = vm.envOr("RELAYER", address(0));

        vm.startBroadcast();
        ElyportLocker locker = new ElyportLocker(owner, feeRecipient, vm.envUint("LOCK_FEE_WEI"));
        ElyportVesting vesting = new ElyportVesting(owner, feeRecipient, vm.envUint("VESTING_FEE_WEI"));
        ElyportDrop drop = new ElyportDrop(owner, feeRecipient, vm.envUint("DROP_FEE_WEI"));
        ElyportRefuelVault vault = new ElyportRefuelVault(
            owner,
            vm.envUint("VAULT_MAX_PER_TX_WEI"),
            vm.envUint("VAULT_MAX_PER_WALLET_DAY_WEI"),
            vm.envUint("VAULT_MAX_PER_DAY_WEI")
        );
        // The relayer can only be set here when the deployer is also the owner.
        if (relayer != address(0) && owner == msg.sender) vault.setRelayer(relayer, true);
        vm.stopBroadcast();

        console2.log("NEXT_PUBLIC_LOCKER_ADDRESS=%s", address(locker));
        console2.log("NEXT_PUBLIC_VESTING_ADDRESS=%s", address(vesting));
        console2.log("NEXT_PUBLIC_DROP_ADDRESS=%s", address(drop));
        console2.log("NEXT_PUBLIC_REFUEL_VAULT_ADDRESS=%s", address(vault));
    }
}

/// @notice Deploys the deposit contract on a source chain (Ethereum, Base, Arbitrum, BNB Chain, HyperEVM).
/// Env: OWNER, RELAYER, USDC (optional), USDC_MIN, USDC_MAX, NATIVE_MIN_WEI, NATIVE_MAX_WEI
contract DeploySource is Script {
    function run() external {
        address owner = vm.envAddress("OWNER");
        address relayer = vm.envOr("RELAYER", address(0));
        address usdc = vm.envOr("USDC", address(0));

        vm.startBroadcast();
        ElyportRefuelDeposit dep = new ElyportRefuelDeposit(owner);
        if (owner == msg.sender) {
            if (relayer != address(0)) dep.setRelayer(relayer, true);
            dep.setLimits(address(0), true, vm.envUint("NATIVE_MIN_WEI"), vm.envUint("NATIVE_MAX_WEI"));
            if (usdc != address(0)) dep.setLimits(usdc, true, vm.envUint("USDC_MIN"), vm.envUint("USDC_MAX"));
        }
        vm.stopBroadcast();

        console2.log("Refuel deposit on chain %s: %s", block.chainid, address(dep));
    }
}
