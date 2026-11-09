// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {EnumerableSet} from "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";
import {ElyportFees} from "./ElyportFees.sol";

/// @title ElyportVesting
/// @notice Token vesting with an optional cliff and linear or stepped (e.g. monthly) release.
///         Nothing is claimable before `start + cliff`; after that, the vested share follows
///         elapsed time since `start`, rounded down to whole `period`s.
contract ElyportVesting is ElyportFees, ReentrancyGuard {
    using SafeERC20 for IERC20;
    using EnumerableSet for EnumerableSet.UintSet;

    struct Schedule {
        address token;
        address creator;
        address beneficiary;
        uint128 total;
        uint128 released;
        uint64 start;
        uint64 cliff; // seconds after start
        uint64 duration; // seconds after start until fully vested
        uint64 period; // 1 = linear (per second), 2_592_000 = 30-day steps
        bool revocable;
        bool revoked;
    }

    /// @dev Each schedule costs ~230k gas; 100 keeps a full batch well under the 32M per-tx limit of Orbit chains.
    uint256 public constant MAX_BATCH = 100;

    /// @notice Flat fee per create call (one or many beneficiaries), in native wei.
    uint256 public vestingFee;

    Schedule[] private _schedules;
    mapping(address token => uint256[]) private _byToken;
    mapping(address account => EnumerableSet.UintSet) private _byBeneficiary;
    mapping(address account => uint256[]) private _byCreator;

    error InvalidSchedule();
    error LengthMismatch();
    error BatchTooLarge();
    error NotBeneficiary();
    error NotCreator();
    error NotRevocable();
    error AlreadyRevoked();
    error NothingToClaim();
    error UnknownSchedule();

    event VestingFeeUpdated(uint256 fee);
    event ScheduleCreated(
        uint256 indexed id,
        address indexed token,
        address indexed beneficiary,
        address creator,
        uint256 total,
        uint64 start,
        uint64 cliff,
        uint64 duration,
        uint64 period,
        bool revocable
    );
    event Claimed(uint256 indexed id, address indexed beneficiary, uint256 amount);
    event Revoked(uint256 indexed id, uint256 vestedKept, uint256 refunded);
    event BeneficiaryTransferred(uint256 indexed id, address indexed from, address indexed to);

    constructor(address initialOwner, address initialFeeRecipient, uint256 initialVestingFee)
        ElyportFees(initialOwner, initialFeeRecipient)
    {
        vestingFee = initialVestingFee;
        emit VestingFeeUpdated(initialVestingFee);
    }

    function setVestingFee(uint256 fee) external onlyOwner {
        vestingFee = fee;
        emit VestingFeeUpdated(fee);
    }

    /// @notice Creates one schedule per beneficiary with the same timing. Tokens are pulled from the caller.
    function createSchedules(
        address token,
        address[] calldata beneficiaries,
        uint256[] calldata amounts,
        uint64 start,
        uint64 cliff,
        uint64 duration,
        uint64 period,
        bool revocable
    ) external payable nonReentrant returns (uint256 firstId) {
        if (msg.value != vestingFee) revert InsufficientFee(vestingFee, msg.value);
        uint256 n = beneficiaries.length;
        if (n == 0 || n != amounts.length) revert LengthMismatch();
        if (n > MAX_BATCH) revert BatchTooLarge();
        if (token == address(0)) revert ZeroAddress();
        if (duration == 0 || cliff > duration || period == 0 || period > duration) revert InvalidSchedule();
        // Keeps start + duration inside uint64 so the schedule can always be read, claimed and revoked.
        if (uint256(start) + duration > type(uint64).max || start > block.timestamp + 3650 days) revert InvalidSchedule();

        uint256 sum;
        for (uint256 i; i < n; ++i) {
            if (beneficiaries[i] == address(0)) revert ZeroAddress();
            if (amounts[i] == 0 || amounts[i] > type(uint128).max) revert InvalidSchedule();
            sum += amounts[i];
        }

        uint256 before = IERC20(token).balanceOf(address(this));
        IERC20(token).safeTransferFrom(msg.sender, address(this), sum);
        // Reject fee-on-transfer tokens: every schedule must be fully backed.
        if (IERC20(token).balanceOf(address(this)) - before != sum) revert InvalidSchedule();

        firstId = _schedules.length;
        for (uint256 i; i < n; ++i) {
            uint256 id = _schedules.length;
            _schedules.push(
                Schedule({
                    token: token,
                    creator: msg.sender,
                    beneficiary: beneficiaries[i],
                    total: uint128(amounts[i]),
                    released: 0,
                    start: start,
                    cliff: cliff,
                    duration: duration,
                    period: period,
                    revocable: revocable,
                    revoked: false
                })
            );
            _byToken[token].push(id);
            _byBeneficiary[beneficiaries[i]].add(id);
            _byCreator[msg.sender].push(id);
            emit ScheduleCreated(id, token, beneficiaries[i], msg.sender, amounts[i], start, cliff, duration, period, revocable);
        }

        _takeFee(msg.value);
    }

    /// @notice Sends everything vested so far to the beneficiary. Anyone can trigger it.
    function claim(uint256 id) public nonReentrant returns (uint256 amount) {
        Schedule storage s = _get(id);
        amount = vestedAmount(id, uint64(block.timestamp)) - s.released;
        if (amount == 0) revert NothingToClaim();
        s.released += uint128(amount);
        IERC20(s.token).safeTransfer(s.beneficiary, amount);
        emit Claimed(id, s.beneficiary, amount);
    }

    /// @notice Stops a revocable schedule. Already-vested tokens stay claimable; the rest return to the creator.
    function revoke(uint256 id) external nonReentrant {
        Schedule storage s = _get(id);
        if (msg.sender != s.creator) revert NotCreator();
        if (!s.revocable) revert NotRevocable();
        if (s.revoked) revert AlreadyRevoked();
        uint256 vested = vestedAmount(id, uint64(block.timestamp));
        uint256 refund = uint256(s.total) - vested;
        s.total = uint128(vested);
        s.revoked = true;
        if (refund > 0) IERC20(s.token).safeTransfer(s.creator, refund);
        emit Revoked(id, vested, refund);
    }

    function transferBeneficiary(uint256 id, address newBeneficiary) external {
        Schedule storage s = _get(id);
        if (msg.sender != s.beneficiary) revert NotBeneficiary();
        if (newBeneficiary == address(0)) revert ZeroAddress();
        _byBeneficiary[s.beneficiary].remove(id);
        _byBeneficiary[newBeneficiary].add(id);
        emit BeneficiaryTransferred(id, s.beneficiary, newBeneficiary);
        s.beneficiary = newBeneficiary;
    }

    // ---------------------------------------------------------------- views

    function vestedAmount(uint256 id, uint64 timestamp) public view returns (uint256) {
        Schedule storage s = _get(id);
        if (s.revoked) return s.total;
        if (timestamp < s.start + s.cliff) return 0;
        uint256 elapsed = timestamp - s.start;
        if (elapsed >= s.duration) return s.total;
        elapsed = (elapsed / s.period) * s.period;
        return (uint256(s.total) * elapsed) / s.duration;
    }

    function claimable(uint256 id) external view returns (uint256) {
        return vestedAmount(id, uint64(block.timestamp)) - _get(id).released;
    }

    function scheduleCount() external view returns (uint256) {
        return _schedules.length;
    }

    function getSchedule(uint256 id) external view returns (Schedule memory) {
        return _get(id);
    }

    function scheduleIdsByToken(address token) external view returns (uint256[] memory) {
        return _byToken[token];
    }

    function scheduleIdsByBeneficiary(address account) external view returns (uint256[] memory) {
        return _byBeneficiary[account].values();
    }

    function scheduleIdsByCreator(address account) external view returns (uint256[] memory) {
        return _byCreator[account];
    }

    function _get(uint256 id) private view returns (Schedule storage) {
        if (id >= _schedules.length) revert UnknownSchedule();
        return _schedules[id];
    }
}
