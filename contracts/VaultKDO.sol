// SPDX-License-Identifier: SEE LICENSE IN LICENSE
pragma solidity 0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/interfaces/IERC20.sol";
import "./IWrappedTokenGatewayV3.sol";

contract VaultKDO is Ownable {

    IWrappedTokenGatewayV3 private wtgV3;//0x387d311e47e80b498169e6fb51d3193167d89F7D 
    IERC20 private erc20Token;//0x5b071b590a59395fE4025A0Ccc1FcC931AAc1830 

    event DepositDone(uint256 amount);
    event WithdrawDone(uint256 amount);

    constructor(IWrappedTokenGatewayV3 _wtgV3, IERC20 _erc20Token) Ownable(msg.sender) {
        wtgV3 = _wtgV3;
        erc20Token = _erc20Token;
    }

    receive() external payable {}

    function deposit() external payable onlyOwner {
        wtgV3.depositETH{value: msg.value}(address(0x6Ae43d3271ff6888e7Fc43Fd7321a503ff738951),address(this),0);
        emit DepositDone(msg.value);
    }

    function withdraw(uint256 amount) external onlyOwner {
        erc20Token.approve(address(0x387d311e47e80b498169e6fb51d3193167d89F7D), amount);
        wtgV3.withdrawETH(address(0x6Ae43d3271ff6888e7Fc43Fd7321a503ff738951), amount, address(this));
        (bool sent,) = msg.sender.call{value: address(this).balance}("");
        require(sent, "Failed to withdraw Ether");
        emit WithdrawDone(amount);
    }

    function getSupply() external view onlyOwner returns (uint256) {
        return erc20Token.balanceOf(address(this));
    }

}