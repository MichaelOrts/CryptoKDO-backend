// SPDX-License-Identifier: SEE LICENSE IN LICENSE
pragma solidity 0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Strings.sol";

contract CryptoKDO is Ownable {

    struct PrizePool {
        uint256 amount;
        address owner;
        address receiver;
        string title;
        string description;
        address[] givers;
    }

    PrizePool[] private prizePools;

    event PrizePoolCreated(uint id, address owner, address receiver, address[] givers, string title, string description);
    event DonationDone(uint id, address giver, uint amount);
    event PrizePoolClosed(PrizePool prizePool);

    constructor() Ownable(msg.sender){}

    receive() external payable {}

    function createPrizePool(address receiver, address[] calldata givers, string calldata title, string calldata description) external {
        require(receiver != address(0), "You cannot create prize pool without receiver");
        require(givers.length > 0, "You cannot create prize pool without giver");
        require(!Strings.equal(title, "") , "You cannot create prize pool without title");
        prizePools.push(PrizePool(0,msg.sender, receiver, title, description, givers));
        emit PrizePoolCreated(prizePools.length - 1, msg.sender, receiver, givers, title, description);
    }

    function closePrizePool(uint256 index) external {
        require(msg.sender == prizePools[index].owner, "You cannot close prize pool if you are not owner");
        PrizePool memory prizePool = prizePools[index];
        removePrizePool(index);
        emit PrizePoolClosed(prizePool);
        (bool sent,) = prizePool.receiver.call{value: prizePool.amount}("");
        require(sent, "Failed to withdraw Ether");
    }

    function donate(uint256 index) external payable {
        require(onlyGiver(prizePools[index].givers), "You cannot donate if you are not giver");
        require(msg.value >= 0.003 ether, "Donation minimum is 0.003 ether");
        prizePools[index].amount += msg.value;
        emit DonationDone(index, msg.sender, msg.value);
    }

    function getTotalPrizePools() external view returns (uint) {
        return prizePools.length;
    }

    function getPrizePool(uint index) external view returns (PrizePool memory) {
        require(index < prizePools.length, string.concat("Any prize pool exist at index ", Strings.toString(index)));
        return prizePools[index];
    }

    function getAllPrizePools() external view returns (PrizePool[] memory) {
        return prizePools;
    }

    function removePrizePool(uint256 index) internal {
        for (uint i = index; i < prizePools.length - 1; i++) {
            prizePools[i] = prizePools[i + 1];
        }
        prizePools.pop();
    }

    function onlyGiver(address[] memory givers) internal view returns(bool) {
        for (uint i = 0; i < givers.length; i++) {
            if(msg.sender == givers[i]){
                return true;
            }
        }
        return false;
    }

}