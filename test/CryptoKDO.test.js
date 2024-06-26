<<<<<<< HEAD
const {
  time,
  loadFixture,
} = require("@nomicfoundation/hardhat-toolbox/network-helpers");
const { anyValue } = require("@nomicfoundation/hardhat-chai-matchers/withArgs");
const { expect } = require("chai");

describe("CryptoKDO", function () {
  
});
=======
const { loadFixture } = require("@nomicfoundation/hardhat-toolbox/network-helpers");
const { anyValue } = require("@nomicfoundation/hardhat-chai-matchers/withArgs");
const { expect, assert } = require("chai");
  
async function deployCryptoKDOFixture() {
    [contractOwner, owner, receiver, giver1, giver2] = await ethers.getSigners();
    let contract = await ethers.getContractFactory('CrytpoKDO');
    cryptoKDO = await contract.deploy();
    return {cryptoKDO, contractOwner, owner, receiver, giver1, giver2};
}

async function deployCryptoKDOWithPrizePoolFixture() {
    [contractOwner, owner, receiver, giver1, giver2, other] = await ethers.getSigners();
    let contract = await ethers.getContractFactory('CrytpoKDO');
    cryptoKDO = await contract.deploy();
    await cryptoKDO.connect(owner).createPrizePool(receiver,[giver1, giver2]);
    return {cryptoKDO, giver1, giver2, other};
}

async function deployCryptoKDOWithFullPrizePoolFixture() {
    [contractOwner, owner, receiver, giver1, giver2, other] = await ethers.getSigners();
    let contract = await ethers.getContractFactory('CrytpoKDO');
    cryptoKDO = await contract.deploy();
    await cryptoKDO.connect(owner).createPrizePool(receiver,[giver1, giver2]);
    await cryptoKDO.connect(giver1).donate({value: ethers.parseEther('0.1')}, 0);
    return {cryptoKDO, owner, receiver, amount, other};
}
  
describe('Test CryptoKDO Contract', function() {
  
    describe('Initialization', function() {
        it('should deploy the smart contract with owner', async function() {
            let {cryptoKDO, contractOwner} = await loadFixture(deployCryptoKDOFixture);
            let theOwner = await cryptoKDO.owner();
            assert.equal(contractOwner.address, theOwner);
        });
        it('should deploy the smart contract with empty prize pools', async function() {
          let {cryptoKDO, contractOwner} = await loadFixture(deployCryptoKDOFixture);
          await expect(cryptoKDO.connect(contractOwner).prizePool(0)).to.be.reverted();
      });
    });
  
    describe('Basic functions', function() {
        describe('Get prize pool', function() {
            it('should get prize pool', async function() {
                let {cryptoKDO, contractOwner, _owner, _receiver, giver1, giver2} = await loadFixture(deployCryptoKDOFixture);
                await cryptoKDO.connect(_owner).createPrizePool(_receiver,[giver1]);
                await cryptoKDO.connect(_owner).createPrizePool(_receiver,[giver2]);
                let prizePool1 = await expect(cryptoKDO.connect(contractOwner).prizePool(0));
                let prizePool2 = await expect(cryptoKDO.connect(contractOwner).prizePool(1));
                assert.deepEqual(prizePool1, {amount: 0, owner: _owner, receiver: _receiver, giver: [giver1]});
                assert.deepEqual(prizePool2, {amount: 0, owner: _owner, receiver: _receiver, giver: [giver2]});
            });
        });
        describe('Create prize pool', function() {
            it('should not create a prize pool without a receiver', async function() {
                let {cryptoKDO, contractOwner, owner} = await loadFixture(deployCryptoKDOFixture);
                await expect(cryptoKDO.connect(owner).createPrizePool(zeroAddress,[])).to.be.revertedWithCustomError(cryptoKDO, 'EmptyReceiver');
            });
            it('should not create a prize pool without a giver', async function() {
                let {cryptoKDO, contractOwner, owner, receiver} = await loadFixture(deployCryptoKDOFixture);
                await expect(cryptoKDO.connect(owner).createPrizePool(receiver,[])).to.be.revertedWithCustomError(cryptoKDO, 'EmptyGiver');
            });
            it('should create an empty prize pool with a receiver and at least a giver', async function() {
                let {cryptoKDO, contractOwner, _owner, _receiver, giver1} = await loadFixture(deployCryptoKDOFixture);
                await expect(cryptoKDO.connect(_owner).createPrizePool(_receiver,[giver1])).to.emit(cryptoKDO, 'PrizePoolCreated').withArgs(0,_owner,_receiver,[giver1]);
                let prizePool = await expect(cryptoKDO.connect(contractOwner).prizePool(0));
                assert.deepEqual(prizePool, {amount: 0, owner: _owner, receiver: _receiver, giver: [giver1]});
            });
    
            it('should create an empty prize pool with a receiver and two givers', async function() {
                let {cryptoKDO, contractOwner, owner, receiver, giver1, giver2} = await loadFixture(deployCryptoKDOFixture);
                await expect(cryptoKDO.connect(owner).createPrizePool(receiver,[giver1, giver2])).to.emit(cryptoKDO, 'PrizePoolCreated').withArgs(0,owner,receiver,[giver1, giver2]);
                let prizePool = await expect(cryptoKDO.connect(contractOwner).prizePool(0));
                assert.deepEqual(prizePool, {amount: 0, owner: _owner, receiver: _receiver, giver: [giver1, giver2]});
            });
        });
  
        describe('Donate', function() {
            it('should not donate if not a giver', async function() {
                let {cryptoKDO, giver1, giver2, other} = await loadFixture(deployCryptoKDOWithPrizePoolFixture);
                await expect(cryptoKDO.connect(other).donate(10)).to.be.revertedWithCustomError(cryptoKDO, 'NotGiver').withArgs(other);
            });
            it('should not donate an amount < 0.003 ETH', async function() {
                let {cryptoKDO, giver1} = await loadFixture(deployCryptoKDOWithPrizePoolFixture);
                await expect(cryptoKDO.connect(giver1).donate({value: ethers.parseEther('0.0029')}, 0)).to.be.revertedWithCustomError(cryptoKDO, 'LowDonation').withArgs(ethers.parseEther('0.0029'));
            });
            it('should donate if giver and amount > 0.03 ETH', async function() {
                let {cryptoKDO, giver1} = await loadFixture(deployCryptoKDOWithPrizePoolFixture);
                let giver1BalanceBefore = await ethers.provider.getBalance(giver1.target);
                await expect(cryptoKDO.connect(giver1).donate({value: ethers.parseEther('0.003')}, 0)).to.emit(cryptoKDO, 'DonationDone').withArgs(ethers.parseEther('0.003'));
                let prizePoolBalance = await cryptoKDO.connect(contractOwner).prizePool(0).amount;
                let contractBalance = await ethers.provider.getBalance(cryptoKDO.target);
                let giver1BalanceAfter = await ethers.provider.getBalance(giver1.target);
                assert.equal(prizePoolBalance, ethers.parseEther('0.003'));
                assert.equal(contractBalance, ethers.parseEther('0.003'));
                assert.equal(giver1BalanceAfter,giver1BalanceBefore - prizePoolBalance);
            });
            it('should donate many times', async function() {
                let {cryptoKDO, giver1, giver2} = await loadFixture(deployCryptoKDOWithPrizePoolFixture);
                let giver1BalanceBefore = await ethers.provider.getBalance(giver1.target);
                let giver2BalanceBefore = await ethers.provider.getBalance(giver2.target);
                await expect(cryptoKDO.connect(giver1).donate({value: ethers.parseEther('0.01')}, 0)).to.emit(cryptoKDO, 'DonationDone').withArgs(ethers.parseEther('0.01'));
                let giver1BalanceAfter = await ethers.provider.getBalance(giver1.target);
                assert.equal(giver1BalanceAfter,giver1BalanceBefore - prizePoolBalance);
                await expect(cryptoKDO.connect(giver2).donate({value: ethers.parseEther('0.2')}, 0)).to.emit(cryptoKDO, 'DonationDone').withArgs(ethers.parseEther('0.2'));
                await expect(cryptoKDO.connect(giver1).donate({value: ethers.parseEther('0.1')}, 0)).to.emit(cryptoKDO, 'DonationDone').withArgs(ethers.parseEther('0.1'));
                giver1BalanceAfter = await ethers.provider.getBalance(giver1.target);
                let giver2BalanceAfter = await ethers.provider.getBalance(giver2.target);
                let prizePoolBalance = await cryptoKDO.connect(contractOwner).prizePool(0).amount;
                let contractBalance = await ethers.provider.getBalance(cryptoKDO.target);
                assert.equal(prizePoolBalance, ethers.parseEther('0.31'));
                assert.equal(contractBalance, ethers.parseEther('0.31'));
                assert.equal(giver1BalanceAfter,giver1BalanceBefore - prizePoolBalance);
                assert.equal(giver2BalanceAfter,giver2BalanceBefore - prizePoolBalance);
            });
        });
  
        describe('Give prize pool', function() {
            it('should not give prize pool if not the owner', async function() {
                let {cryptoKDO, owner, receiver, amount, other} = await loadFixture(deployCryptoKDOWithFullPrizePoolFixture);
                await expect(cryptoKDO.connect(other).closePrizePool(0)).to.be.revertedWithCustomError(cryptoKDO, 'NotOwner').withArgs(other);
            });
    
            it('should give prize pool if owner', async function() {
                let {cryptoKDO, owner, receiver, amount} = await loadFixture(deployCryptoKDOWithFullPrizePoolFixture);
                let receiverBalanceBefore = await ethers.provider.getBalance(receiver.target);
                let prizePoolBalance = await cryptoKDO.connect(contractOwner).prizePool(0).amount;
                await expect(cryptoKDO.connect(owner).closePrizePool(0)).to.emit(cryptoKDO, 'PrizePoolClosed').withArgs(receiver, amount);
                await expect(cryptoKDO.connect(contractOwner).prizePool(0)).to.be.reverted();
                let contractBalance = await ethers.provider.getBalance(cryptoKDO.target);
                let receiverBalanceAfter = await ethers.provider.getBalance(receiver.target);
                assert.equal(contractBalance, ethers.parseEther('0'));
                assert.equal(receiverBalanceAfter,receiverBalanceBefore + prizePoolBalance);
            });
        });
    });
});
  
>>>>>>> 889d39d (test basic functions)
