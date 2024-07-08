// SPDX-License-Identifier: SEE LICENSE IN LICENSE
pragma solidity 0.8.24;

import "@openzeppelin/contracts/interfaces/IERC20.sol";

contract ERC20Mock is IERC20 {

    mapping(address => uint256) balances;
    mapping(address => mapping (address => uint256)) allowances;

    constructor() {
        balances[address(this)] = 1000 ether;
    }

    function totalSupply() external view override returns (uint256) {}

    function balanceOf(
        address account
    ) external view override returns (uint256) {
        return balances[account];
    }

    function transfer(
        address to,
        uint256 value
    ) external override returns (bool) {
        balances[msg.sender] -= value;
        balances[to] += value;
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
    ) external override returns (bool) {
        balances[from] -= value;
        balances[to] += value;
        return true;
    }
}