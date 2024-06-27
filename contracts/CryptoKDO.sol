// SPDX-License-Identifier: SEE LICENSE IN LICENSE
pragma solidity 0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Strings.sol";

contract CryptoKDO is Ownable {

    event PrizePoolCreated(uint id, address owner, address receiver, address[] givers);
    event DonationDone(uint id, address giver, uint amount);
    event PrizePoolClosed(PrizePool prizePool);

    struct PrizePool {
        uint256 amount;
        address owner;
        address receiver;
        address[] givers;
    }

    PrizePool[] public prizePools;

    constructor() Ownable(msg.sender){}

    function isGiver(address[] memory _givers) internal view returns(bool) {
        for (uint i = 0; i < _givers.length; i++) {
            if(msg.sender == _givers[i]){
                return true;
            }
        }
        return false;
    }

    function removePrizePool(uint256 index) internal {
        for (uint i = index; i < prizePools.length - 1; i++) {
            prizePools[i] = prizePools[i + 1];
        }
        prizePools.pop();
    }

    function getPrizePool(uint index) view external returns (PrizePool memory) {
        require(index < prizePools.length, string.concat("Any prize pool exist at index ", Strings.toString(index)));
        return prizePools[index];
    }

    function createPrizePool(address _receiver, address[] memory _givers) external {
        require(_receiver != address(0), "You cannot create prize pool without receiver");
        require(_givers.length > 0, "You cannot create prize pool without giver");
        prizePools.push(PrizePool(0,msg.sender, _receiver, _givers));
        emit PrizePoolCreated(prizePools.length - 1, msg.sender, _receiver, _givers);
    }

    function closePrizePool(uint256 index) external {
        require(msg.sender == prizePools[index].owner, "You cannot close prize pool if you are not owner");
        PrizePool memory prizePool = prizePools[index];
        removePrizePool(index);
        (bool sent,) = prizePool.receiver.call{value: prizePool.amount}("");
        require(sent, "Failed to withdraw Ether");
        emit PrizePoolClosed(prizePool);
    }

    function donate(uint256 index) external payable {
        require(isGiver(prizePools[index].givers), "You cannot donate if you are not giver");
        require(msg.value >= 0.003 ether, "Donation minimum is 0.003 ether");
        prizePools[index].amount += msg.value;
        emit DonationDone(index, msg.sender, msg.value);
    }

    receive() payable external {

    }
}