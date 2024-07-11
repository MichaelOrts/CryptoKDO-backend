// SPDX-License-Identifier: SEE LICENSE IN LICENSE
pragma solidity 0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/interfaces/IERC20.sol";
import "./IWrappedTokenGatewayV3.sol";

/**
 * @title VaultKDO
 * @author Michael Orts
 * @notice VaultKDO allows to deposit and withdraw pool funds on DeFi platform.
 */
contract VaultKDO is Ownable {

    IWrappedTokenGatewayV3 private immutable wtgV3;
    IERC20 private immutable erc20Token;

    event DepositDone(uint256 amount);
    event WithdrawDone(uint256 amount);

    /**
     * Creates VaultKDO as owner with implementations of AAVE contracts needed.
     *
     * @param _wtgV3 AAVE gateway contract
     * @param _erc20Token ERC20 token
     */
    constructor(
        IWrappedTokenGatewayV3 _wtgV3, IERC20 _erc20Token) Ownable(msg.sender) {
        wtgV3 = _wtgV3;
        erc20Token = _erc20Token;
    }

    receive() external payable {}

    /**
     * Deposits funds on Aave platform.
     */
    function deposit() external payable onlyOwner {
        emit DepositDone(msg.value);
        wtgV3.depositETH{value: msg.value}(
            address(0x6Ae43d3271ff6888e7Fc43Fd7321a503ff738951),
            address(this),
            0
        );
    }

    /**
     * Withdraws amount, and send it to sender if owner.
     *
     * @param amount amount to withdraw
     */
    function withdraw(uint256 amount) external onlyOwner {
        emit WithdrawDone(amount);
        require(erc20Token.approve(address(wtgV3), amount), "approve failed");
        wtgV3.withdrawETH(
            address(0x6Ae43d3271ff6888e7Fc43Fd7321a503ff738951),
            amount,
            address(this)
        );
        (bool sent, ) = msg.sender.call{value: address(this).balance}("");
        require(sent, "Failed to withdraw Ether");
    }

    /**
     * Returns all supply deposited if owner.
     */
    function getSupply() public view onlyOwner returns (uint256) {
        return erc20Token.balanceOf(address(this));
    }

}