// SPDX-License-Identifier: SEE LICENSE IN LICENSE
pragma solidity 0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/interfaces/IERC20.sol";
import "./IWrappedTokenGatewayV3.sol";

import {VRFCoordinatorV2Interface} from "@chainlink/contracts/src/v0.8/vrf/interfaces/VRFCoordinatorV2Interface.sol";
import {VRFConsumerBaseV2} from "@chainlink/contracts/src/v0.8/vrf/VRFConsumerBaseV2.sol";

/**
 * @title VaultKDO
 * @author Michael Orts
 * @notice VaultKDO allows to deposit and withdraw pool funds on DeFi platform.
 */
contract VaultKDO is Ownable, VRFConsumerBaseV2 {

    uint256 private constant SUBSCRIPTION_ID = 21757035435589094546153641321485101678538335732774970062295342423332900986538;
    address private constant COORDINATOR_ = 0x9DdfaCa8183c41ad55329BdeeD9F6A8d53168B1B;
    bytes32 private constant KEY_HASH = 0x787d74caea10b2b357790d5b5247c2f63d1d91572a9846f780606e4d953677ae;
    uint32 private constant CALLBACK_GAS_LIMIT = 40000;
    uint16 private constant REQUEST_CONFIRMATIONS = 3;
    uint32 private constant NUM_WORDS = 1;

    IWrappedTokenGatewayV3 private immutable wtgV3; //0x387d311e47e80b498169e6fb51d3193167d89F7D
    IERC20 private immutable erc20Token; //0x5b071b590a59395fE4025A0Ccc1FcC931AAc1830
    VRFCoordinatorV2Interface immutable COORDINATOR;
    uint256 public winningPrizePoolId;
    uint256 public prizePoolsLength;
    uint64 private subscriptionId;
    bytes32 private keyHash;

    event DepositDone(uint256 amount);
    event WithdrawDone(uint256 amount);

    /**
     * Creates VaultKDO as owner with implementations of AAVE contracts needed.
     *
     * @param _wtgV3 AAVE gateway contract
     * @param _erc20Token ERC20 token
     */
    constructor(
        IWrappedTokenGatewayV3 _wtgV3, 
        IERC20 _erc20Token, 
        uint64 _subscriptionId,
        address vrfCoordinator,
        bytes32 _keyHash 

    ) Ownable(msg.sender) VRFConsumerBaseV2(vrfCoordinator) {
        COORDINATOR = VRFCoordinatorV2Interface(vrfCoordinator);
        wtgV3 = _wtgV3;
        erc20Token = _erc20Token;
        subscriptionId = _subscriptionId;
        keyHash = _keyHash;
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

    function fulfillRandomWords(uint256 requestId, uint256[] memory randomWords) internal override {
        winningPrizePoolId = randomWords[0] % prizePoolsLength;
    }

    function prizePoolDraw(uint256 _prizePoolsLength) public onlyOwner {
        prizePoolsLength = _prizePoolsLength;
        COORDINATOR.requestRandomWords(
            keyHash,
            subscriptionId,
            REQUEST_CONFIRMATIONS,
            CALLBACK_GAS_LIMIT,
            NUM_WORDS
        );
    }
}