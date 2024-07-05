const { loadFixture } = require("@nomicfoundation/hardhat-toolbox/network-helpers");
const { expect, assert } = require("chai");
const {ethers} = require('hardhat');
  
async function deployCryptoKDOFixture() {
    [contractOwner, owner, receiver, giver1, giver2] = await ethers.getSigners();
    let contract = await ethers.getContractFactory('CryptoKDO');
    cryptoKDO = await contract.deploy();
    return {cryptoKDO, contractOwner, owner, receiver, giver1, giver2};
}

async function deployCryptoKDOWithPrizePoolFixture() {
    [contractOwner, owner, receiver, giver1, giver2, other] = await ethers.getSigners();
    let contract = await ethers.getContractFactory('CryptoKDO');
    cryptoKDO = await contract.deploy();
    await cryptoKDO.connect(owner).createPrizePool(receiver, [giver1, giver2], "test prize pool");
    return {cryptoKDO, giver1, giver2, other};
}

async function deployCryptoKDOWithFullPrizePoolFixture() {
    [contractOwner, owner, receiver, giver1, giver2, other] = await ethers.getSigners();
    let contract = await ethers.getContractFactory('CryptoKDO');
    let amount = ethers.parseEther('0.1');
    cryptoKDO = await contract.deploy();
    await cryptoKDO.connect(owner).createPrizePool(receiver, [giver1, giver2], "test prize pool");
    await cryptoKDO.connect(giver1).donate(0, {value: amount});
    return {cryptoKDO, owner, receiver, giver1, giver2, other, amount};
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
          await expect(cryptoKDO.connect(contractOwner).getPrizePool(0)).to.be.revertedWith("Any prize pool exist at index 0");
      });
    });
  
    describe('Basic functions', function() {
        describe('Get prize pool', function() {
            it('should get prize pool', async function() {
                let {cryptoKDO, contractOwner, owner, receiver, giver1, giver2} = await loadFixture(deployCryptoKDOFixture);
                await cryptoKDO.connect(owner).createPrizePool(receiver.address, [giver1.address], "test prize pool");
                await cryptoKDO.connect(owner).createPrizePool(receiver.address, [giver2.address], "test prize pool");
                let prizePool1 = await cryptoKDO.connect(contractOwner).getPrizePool(0);
                let prizePool2 = await cryptoKDO.connect(contractOwner).getPrizePool(1);
                assert.deepEqual(prizePool1, [0n, owner.address, receiver.address, "test prize pool", [giver1.address]]);
                assert.deepEqual(prizePool2, [0n, owner.address, receiver.address, "test prize pool", [giver2.address]]);
            });
            it('should get total prize pools', async function() {
                let {cryptoKDO, contractOwner, owner, receiver, giver1, giver2} = await loadFixture(deployCryptoKDOFixture);
                await cryptoKDO.connect(owner).createPrizePool(receiver.address, [giver1.address], "test prize pool");
                await cryptoKDO.connect(owner).createPrizePool(receiver.address, [giver2.address], "test prize pool");
                let totalPrizePools = await cryptoKDO.connect(contractOwner).getTotalPrizePools();
                assert.equal(totalPrizePools, 2);
            });
        });
        describe('Create prize pool', function() {
            it('should not create a prize pool without a receiver', async function() {
                let {cryptoKDO, owner} = await loadFixture(deployCryptoKDOFixture);
                await expect(cryptoKDO.connect(owner).createPrizePool('0x0000000000000000000000000000000000000000',[], "test prize pool")).to.be.revertedWith("You cannot create prize pool without receiver");
            });
            it('should not create a prize pool without a giver', async function() {
                let {cryptoKDO, owner, receiver} = await loadFixture(deployCryptoKDOFixture);
                await expect(cryptoKDO.connect(owner).createPrizePool(receiver,[], "test prize pool")).to.be.revertedWith("You cannot create prize pool without giver");
            });
            it('should create an empty prize pool with a receiver and at least a giver', async function() {
                let {cryptoKDO, contractOwner, owner, receiver, giver1} = await loadFixture(deployCryptoKDOFixture);
                await expect(cryptoKDO.connect(owner).createPrizePool(receiver,[giver1], "test prize pool")).to.emit(cryptoKDO, 'PrizePoolCreated').withArgs(0, owner, receiver, [giver1], "test prize pool");
                let prizePool = await cryptoKDO.connect(contractOwner).getPrizePool(0);
                assert.deepEqual(prizePool, [0n, owner.address, receiver.address, "test prize pool", [giver1.address]]);
            });
    
            it('should create an empty prize pool with a receiver and two givers', async function() {
                let {cryptoKDO, contractOwner, owner, receiver, giver1, giver2} = await loadFixture(deployCryptoKDOFixture);
                await expect(cryptoKDO.connect(owner).createPrizePool(receiver,[giver1, giver2], "test prize pool")).to.emit(cryptoKDO, 'PrizePoolCreated').withArgs(0, owner, receiver, [giver1, giver2], "test prize pool");
                let prizePool = await cryptoKDO.connect(contractOwner).getPrizePool(0);
                assert.deepEqual(prizePool, [0n, owner.address, receiver.address, "test prize pool", [giver1.address, giver2.address]]);
            });
        });
  
        describe('Donate', function() {
            it('should not donate if not a giver', async function() {
                let {cryptoKDO, other} = await loadFixture(deployCryptoKDOWithPrizePoolFixture);
                await expect(cryptoKDO.connect(other).donate(0, {value: ethers.parseEther('0.1')})).to.be.revertedWith("You cannot donate if you are not giver");
            });
            it('should not donate an amount < 0.003 ETH', async function() {
                let {cryptoKDO, giver1} = await loadFixture(deployCryptoKDOWithPrizePoolFixture);
                await expect(cryptoKDO.connect(giver1).donate(0, {value: ethers.parseEther('0.0029')})).to.be.revertedWith("Donation minimum is 0.003 ether");
            });
            it('should donate if giver and amount > 0.03 ETH', async function() {
                let {cryptoKDO, giver1} = await loadFixture(deployCryptoKDOWithPrizePoolFixture);
                let giver1BalanceBefore = await ethers.provider.getBalance(giver1.address);
                await expect(cryptoKDO.connect(giver1).donate(0, {value: ethers.parseEther('0.003')})).to.emit(cryptoKDO, 'DonationDone').withArgs(0, giver1.address, ethers.parseEther('0.003'));
                let prizePoolBalance = (await cryptoKDO.connect(giver1).getPrizePool(0)).amount;
                let contractBalance = await ethers.provider.getBalance(cryptoKDO.target);
                let giver1BalanceAfter = await ethers.provider.getBalance(giver1.address);
                assert.equal(prizePoolBalance, ethers.parseEther('0.003'));
                assert.equal(contractBalance, ethers.parseEther('0.003'));
                expect(giver1BalanceAfter).to.be.approximately(giver1BalanceBefore - prizePoolBalance, 1000000000000000n);
            });
            it('should donate many times', async function() {
                let {cryptoKDO, giver1, giver2} = await loadFixture(deployCryptoKDOWithPrizePoolFixture);
                let giver1BalanceBefore = await ethers.provider.getBalance(giver1.address);
                let giver2BalanceBefore = await ethers.provider.getBalance(giver2.address);
                await expect(cryptoKDO.connect(giver1).donate(0, {value: ethers.parseEther('0.01')})).to.emit(cryptoKDO, 'DonationDone').withArgs(0, giver1.address, ethers.parseEther('0.01'));
                let giver1BalanceAfter = await ethers.provider.getBalance(giver1.address);
                let prizePoolBalance = (await cryptoKDO.connect(giver1).getPrizePool(0)).amount;
                expect(giver1BalanceAfter).to.be.approximately(giver1BalanceBefore - prizePoolBalance, 1000000000000000n);
                await expect(cryptoKDO.connect(giver2).donate(0, {value: ethers.parseEther('0.2')})).to.emit(cryptoKDO, 'DonationDone').withArgs(0, giver2.address, ethers.parseEther('0.2'));
                await expect(cryptoKDO.connect(giver1).donate(0, {value: ethers.parseEther('0.1')})).to.emit(cryptoKDO, 'DonationDone').withArgs(0, giver1.address, ethers.parseEther('0.1'));
                giver1BalanceAfter = await ethers.provider.getBalance(giver1.address);
                let giver2BalanceAfter = await ethers.provider.getBalance(giver2.address);
                prizePoolBalance = (await cryptoKDO.connect(giver1).getPrizePool(0)).amount;
                let contractBalance = await ethers.provider.getBalance(cryptoKDO.target);
                assert.equal(prizePoolBalance, ethers.parseEther('0.31'));
                assert.equal(contractBalance, ethers.parseEther('0.31'));
                expect(giver1BalanceAfter).to.be.approximately(giver1BalanceBefore - prizePoolBalance + ethers.parseEther('0.2'), 1000000000000000n);
                expect(giver2BalanceAfter).to.be.approximately(giver2BalanceBefore - prizePoolBalance + ethers.parseEther('0.11'), 1000000000000000n);
            });
        });
  
        describe('Give prize pool', function() {
            it('should not give prize pool if not the owner', async function() {
                let {cryptoKDO, other} = await loadFixture(deployCryptoKDOWithFullPrizePoolFixture);
                await expect(cryptoKDO.connect(other).closePrizePool(0)).to.be.revertedWith("You cannot close prize pool if you are not owner");
            });
    
            it('should give prize pool if owner', async function() {
                let {cryptoKDO, owner, receiver, giver1, giver2, amount} = await loadFixture(deployCryptoKDOWithFullPrizePoolFixture);
                let receiverBalanceBefore = await ethers.provider.getBalance(receiver.address);
                let prizePoolBalance = (await cryptoKDO.connect(owner).getPrizePool(0)).amount;
                await expect(cryptoKDO.connect(owner).closePrizePool(0)).to.emit(cryptoKDO, 'PrizePoolClosed').withArgs([amount, owner, receiver, "test prize pool", [giver1, giver2]]);
                await expect(cryptoKDO.connect(owner).getPrizePool(0)).to.be.revertedWith("Any prize pool exist at index 0");
                let contractBalance = await ethers.provider.getBalance(cryptoKDO.target);
                let receiverBalanceAfter = await ethers.provider.getBalance(receiver.address);
                assert.equal(prizePoolBalance, amount);
                assert.equal(contractBalance, ethers.parseEther('0'));
                assert.equal(receiverBalanceAfter,receiverBalanceBefore + prizePoolBalance);
            });
        });
    });
});
  
