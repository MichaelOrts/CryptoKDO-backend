// SPDX-License-Identifier: SEE LICENSE IN LICENSE
pragma solidity 0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Strings.sol";
import "@openzeppelin/contracts/interfaces/IERC20.sol";
import "./IWrappedTokenGatewayV3.sol";
import "./VaultKDO.sol";

/**
 * @title CryptoKDO
 * @author Michael Orts
 * @notice CryptoKDO is the entrance to CryptoKDO platform. It manages prize pools and calls to VaultKDO.
 */
contract CryptoKDO is Ownable {

    struct PrizePool {
        uint256 amount;
        address owner;
        address receiver;
        string title;
        string description;
        address[] givers;
    }

    uint256 private currentSupply;

    VaultKDO private immutable vault;
    PrizePool[] private prizePools;

    event PrizePoolCreated(uint id, address owner, address receiver, address[] givers, string title, string description);
    event DonationDone(uint id, address giver, uint amount);
    event PrizePoolClosed(PrizePool prizePool);

    /**
     * Creates its Vault with an AAVE gateway and an ERC20 token.
     * 
     * @param wtg AAVE gateway
     * @param erc20 ERC20 token
     */
    constructor(IWrappedTokenGatewayV3 wtg, IERC20 erc20, uint64 subscriptionId, address vrfCoordinator, bytes32 keyHash) Ownable(msg.sender) {
        vault = new VaultKDO(wtg, erc20, subscriptionId, vrfCoordinator, keyHash);
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
    function closePrizePool(uint256 index) external updateRewards {
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
    function donate(uint256 index) external payable updateRewards {
        require(onlyGiver(prizePools[index].givers), "You cannot donate if you are not giver");
        require(msg.value >= 0.003 ether, "Donation minimum is 0.003 ether");
        prizePools[index].amount += msg.value;
        currentSupply += msg.value;
        emit DonationDone(index, msg.sender, msg.value);
        vault.deposit{value: msg.value}();
    }

    /**
     * Returns the active pools number.
     */
    function getTotalPrizePools() external view returns (uint) {
        return prizePools.length;
    }

    /**
     * Returns a prize pool. Add reward if needed.
     * 
     * @param index pool index to return
     */
    function getPrizePool(uint index) external view returns (PrizePool memory) {
        require(index < prizePools.length, string.concat("Any prize pool exist at index ", Strings.toString(index)));
        PrizePool memory prizePool = prizePools[index];
        prizePool.amount += computeReward(prizePool.amount, getTotalSupply());
        return prizePool;
    }

    /**
     * returns all active pools. Add reward if needed.
     */
    function getAllPrizePools() external view returns (PrizePool[] memory) {
        PrizePool[] memory pools = prizePools;
        uint256 totalSupply = getTotalSupply();
        for (uint i = 0; i < pools.length; i++) {
            pools[i].amount += computeReward(pools[i].amount, totalSupply);
        }
        return pools;
    }

    /**
     * Returns all supply deposited with rewards added.
     */
    function getTotalSupply() public view returns (uint256) {
        return vault.getSupply();
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
     * Computes reward switch amount deposited.
     * 
     * @param amount amount to compute
     * @param totalSupply supply with rewards
     */
    function computeReward(uint256 amount, uint256 totalSupply) internal view returns (uint256) {
        if (currentSupply > 0){
            return (totalSupply - currentSupply) * amount / currentSupply;
        }else{
            return 0;
        }
    }

    /**
     * Updates rewards on prize pools and supply.
     */
    modifier updateRewards() {
        uint256 totalSupply = getTotalSupply();
        for (uint i = 0; i < prizePools.length; i++) {
            prizePools[i].amount += computeReward(prizePools[i].amount, totalSupply);
        }
        currentSupply = totalSupply;
        _;
    }

}