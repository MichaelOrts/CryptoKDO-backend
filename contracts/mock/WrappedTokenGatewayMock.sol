// SPDX-License-Identifier: SEE LICENSE IN LICENSE
pragma solidity 0.8.24;

import "../IWrappedTokenGatewayV3.sol";
import "@openzeppelin/contracts/interfaces/IERC20.sol";

contract WrappedTokenGatewayMock is IWrappedTokenGatewayV3 {

    IERC20 token;

    constructor(IERC20 erc20) payable {
        token = erc20;
    }

    receive() payable external {}

    function depositETH(
        address pool,
        address onBehalfOf,
        uint16 referralCode
    ) external payable override {
        token.transferFrom(address(token), msg.sender, msg.value);
    }

    function withdrawETH(
        address pool,
        uint256 amount,
        address onBehalfOf
    ) external override {
        token.transferFrom(msg.sender, address(token), amount);
        (bool sent,) = msg.sender.call{value: amount}("");
        require(sent, "Failed to withdraw Ether");
    }

    function repayETH(
        address pool,
        uint256 amount,
        uint256 rateMode,
        address onBehalfOf
    ) external payable override {}

    function borrowETH(
        address pool,
        uint256 amount,
        uint256 interestRateMode,
        uint16 referralCode
    ) external override {}

    function withdrawETHWithPermit(
        address pool,
        uint256 amount,
        address to,
        uint256 deadline,
        uint8 permitV,
        bytes32 permitR,
        bytes32 permitS
    ) external override {}
}