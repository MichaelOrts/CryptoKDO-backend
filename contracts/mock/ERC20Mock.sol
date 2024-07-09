// SPDX-License-Identifier: SEE LICENSE IN LICENSE
pragma solidity 0.8.24;

import "@openzeppelin/contracts/interfaces/IERC20.sol";

contract ERC20Mock is IERC20 {

    struct BalanceStaked {
        uint256 timestamp;
        uint256 amount;
    }

    uint256 constant rewardRate = 10;
    uint256 constant rewardDuration = 1 days;

    mapping(address => BalanceStaked) balances;
    mapping(address => mapping (address => uint256)) allowances;

    constructor() {
        balances[address(this)] = BalanceStaked(block.timestamp, 1000 ether);
    }

    modifier applyReward(address account){
        balances[account].amount *= (block.timestamp - balances[account].timestamp) / rewardDuration * rewardRate / 100 + 1;
        balances[account].timestamp = block.timestamp;
        _;
    }

    function totalSupply() external view override returns (uint256) {}

    function balanceOf(
        address account
    ) external view override returns (uint256) {
        return balances[account].amount;
    }

    function transfer(
        address to,
        uint256 value
    ) external override applyReward(msg.sender) applyReward(to) returns (bool) {
        balances[msg.sender].amount -= value;
        balances[to].amount += value;
        return true;
    }

    function allowance(
        address owner,
        address spender
    ) external view override returns (uint256) {
        return allowances[owner][spender];
    }

    function approve(
        address spender,
        uint256 value
    ) external override returns (bool) {
        allowances[msg.sender][spender] = value;
        return true;
    }

    function transferFrom(
        address from,
        address to,
        uint256 value
    ) external override applyReward(from) applyReward(to) returns (bool) {
        balances[from].amount -= value;
        balances[to].amount += value;
        return true;
    }
}