// SPDX-License-Identifier: SEE LICENSE IN LICENSE
pragma solidity 0.8.24;

import "@openzeppelin/contracts/utils/Strings.sol";
import "@openzeppelin/contracts/interfaces/IERC20.sol";
import "./IWrappedTokenGatewayV3.sol";
import "./VaultKDO.sol";

import {VRFCoordinatorV2Interface} from "@chainlink/contracts/src/v0.8/vrf/interfaces/VRFCoordinatorV2Interface.sol";
import {VRFConsumerBaseV2} from "@chainlink/contracts/src/v0.8/vrf/VRFConsumerBaseV2.sol";

/**
 * @title CryptoKDO
 * @author Michael Orts
 * @notice CryptoKDO is the entrance to CryptoKDO platform. It manages prize pools and calls to VaultKDO.
 */
contract CryptoKDO is VRFConsumerBaseV2{

    uint32 private constant CALLBACK_GAS_LIMIT = 40000;
    uint16 private constant REQUEST_CONFIRMATIONS = 3;
    uint32 private constant NUM_WORDS = 1;

    uint256 constant private LOTTERY_TIME = 10 days;

    VRFCoordinatorV2Interface immutable private coordinator;
    uint64 immutable private subscriptionId;
    bytes32 immutable private keyHash;

    struct PrizePool {
        uint256 amount;
        address owner;
        address receiver;
        string title;
        string description;
        address[] givers;
    }

    VaultKDO private immutable vault;
    PrizePool[] private prizePools;

    uint256 public currentSupply;
    uint256 public lastLotteryTimestamp;
    uint256 public winningPrizePoolId;
    uint256 public reward;
    uint256 private lastRequestId;

    event PrizePoolCreated(uint id, address owner, address receiver, address[] givers, string title, string description);
    event DonationDone(uint id, address giver, uint amount);
    event PrizePoolClosed(PrizePool prizePool);

    /**
     * Creates its Vault with an AAVE gateway and an ERC20 token.
     * 
     * @param wtg AAVE gateway
     * @param erc20 ERC20 token
     */
    constructor(IWrappedTokenGatewayV3 wtg, IERC20 erc20, uint64 _subscriptionId, address vrfCoordinator, bytes32 _keyHash) VRFConsumerBaseV2(vrfCoordinator) {
        vault = new VaultKDO(wtg, erc20);
        coordinator = VRFCoordinatorV2Interface(vrfCoordinator);
        subscriptionId = _subscriptionId;
        keyHash = _keyHash;
        lastLotteryTimestamp = block.timestamp;
    }

    receive() external payable {}

    /**
     * Creates a new empty pool as owner.
     * 
     * @param receiver address of user who receive funds
     * @param givers address list of users can donate to pool
     * @param title a title to identify the pool
     * @param description a little description for users
     */
    function createPrizePool(address receiver, address[] calldata givers, string calldata title, string calldata description) external {
        require(receiver != address(0), "You cannot create prize pool without receiver");
        require(givers.length > 0, "You cannot create prize pool without giver");
        require(!Strings.equal(title, "") , "You cannot create prize pool without title");
        prizePools.push(PrizePool(0,msg.sender, receiver, title, description, givers));
        emit PrizePoolCreated(prizePools.length - 1, msg.sender, receiver, givers, title, description);
    }

    /**
     * Closes prize pool if owner and withdraws funds on vault to receiver.
     * 
     * @param index pool index to close
     */
    function closePrizePool(uint256 index) external {
        require(msg.sender == prizePools[index].owner, "You cannot close prize pool if you are not owner");
        PrizePool memory prizePool = prizePools[index];
        removePrizePool(index);
        currentSupply -= prizePool.amount;
        emit PrizePoolClosed(prizePool);
        vault.withdraw(prizePool.amount);
        (bool sent,) = prizePool.receiver.call{value: prizePool.amount}("");
        require(sent, "Failed to withdraw Ether");
    }

    /**
     * Donates on pool if owner and deposit amount by vault.
     * 
     * @param index pool index to donate
     */
    function donate(uint256 index) external payable {
        require(onlyGiver(prizePools[index].givers), "You cannot donate if you are not giver");
        require(msg.value >= 0.003 ether, "Donation minimum is 0.003 ether");
        prizePools[index].amount += msg.value;
        currentSupply += msg.value;
        emit DonationDone(index, msg.sender, msg.value);
        vault.deposit{value: msg.value}();
    }

    /**
     * Updates rewards on prize pools and supply.
     * 
     * @dev update rewards is necessary to refresh prize pools with lottery and rewards
     */
    function updateRewards() external {
        reward = vault.getSupply() - currentSupply;
        if(block.timestamp > lastLotteryTimestamp + LOTTERY_TIME){
            currentSupply += reward; // fail if its done in fulfilRandomWords
            lastLotteryTimestamp += LOTTERY_TIME;
            prizePoolDraw();
        }
    }

    /**
     * Returns the active pools number.
     */
    function getTotalPrizePools() external view returns (uint) {
        return prizePools.length;
    }

    /**
     * Returns a prize pool.
     * 
     * @param index pool index to return
     */
    function getPrizePool(uint index) external view returns (PrizePool memory) {
        require(index < prizePools.length, string.concat("Any prize pool exist at index ", Strings.toString(index)));
        return prizePools[index];
    }

    /**
     * returns all active pools.
     */
    function getAllPrizePools() external view returns (PrizePool[] memory) {
        return prizePools;
    }

    /**
     * Removes a pool and resizes pool array.
     * 
     * @param index pool index to remove
     */
    function removePrizePool(uint256 index) internal {
        for (uint i = index; i < prizePools.length - 1; i++) {
            prizePools[i] = prizePools[i + 1];
        }
        prizePools.pop();
    }

    /**
     * Checks if sender is in givers list.
     * 
     * @param givers givers list to check
     */
    function onlyGiver(address[] memory givers) internal view returns(bool) {
        for (uint i = 0; i < givers.length; i++) {
            if(msg.sender == givers[i]){
                return true;
            }
        }
        return false;
    }

    /**
     * Updates winning prize pool and reward.
     * @param requestId request id
     * @param randomWords randomWords generated
     */
    function fulfillRandomWords(uint256 requestId, uint256[] memory randomWords) internal override {
        require(lastRequestId == requestId);
        winningPrizePoolId = randomWords[0] % prizePools.length;
        prizePools[winningPrizePoolId].amount += reward;
        reward = 0;
    }

    /**
     * Call VRF to genereate new random word.
     */
    function prizePoolDraw() internal {
        lastRequestId = coordinator.requestRandomWords(
            keyHash,
            subscriptionId,
            REQUEST_CONFIRMATIONS,
            CALLBACK_GAS_LIMIT,
            NUM_WORDS
        );
    }

}