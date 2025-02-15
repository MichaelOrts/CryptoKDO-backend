const { time, loadFixture } = require("@nomicfoundation/hardhat-toolbox/network-helpers");
const { expect, assert } = require("chai");
const { ethers } = require('hardhat');


const SUB_ID = 1;
const KEY_HASH = "0xd89b2bf150e3b9e13446986e571fb9cab24b13cea0a43ea20a6049a85cc807cc";

async function deployVRFCoordinatorFixture() {
    const BASE_FEE = "1000000000000000";
    const GAS_PRICE_LINK = "1000000000";
    const FUND = "1000000000000000000";

    const vRFCoordinatorV2MockContract = await ethers.getContractFactory('VRFCoordinatorV2Mock');
    const vRFCoordinatorV2Mock = await vRFCoordinatorV2MockContract.deploy(BASE_FEE,GAS_PRICE_LINK);

    await vRFCoordinatorV2Mock.createSubscription();
    await vRFCoordinatorV2Mock.fundSubscription(SUB_ID, FUND);
    return vRFCoordinatorV2Mock;
}

async function deployCryptoKDOFixture() {
    [contractOwner, owner, receiver, giver1, giver2, other] = await ethers.getSigners();

    let contract = await ethers.getContractFactory('CryptoKDO');
    let eRC20Contract = await ethers.getContractFactory('ERC20Mock');
    let wtgContract = await ethers.getContractFactory('WrappedTokenGatewayMock');
    let vRFCoordinatorV2Mock = await deployVRFCoordinatorFixture();

    eRC20 = await eRC20Contract.deploy();
    wtg = await wtgContract.deploy(eRC20,{value : ethers.parseEther('1000')});
    cryptoKDO = await contract.deploy(wtg, eRC20,1,vRFCoordinatorV2Mock,KEY_HASH);

    await vRFCoordinatorV2Mock.addConsumer(SUB_ID, cryptoKDO);
    return {cryptoKDO, contractOwner, owner, receiver, giver1, giver2, other, vRFCoordinatorV2Mock};
}

async function deployCryptoKDOWithPrizePoolFixture() {
    let {cryptoKDO, contractOwner, owner, receiver, giver1, giver2, other, vRFCoordinatorV2Mock} = await loadFixture(deployCryptoKDOFixture);
    await cryptoKDO.connect(owner).createPrizePool(receiver, [giver1, giver2], "Prize Pool", "test prize pool");
    return {cryptoKDO, contractOwner, owner, receiver, giver1, giver2, other, vRFCoordinatorV2Mock};
}

async function deployCryptoKDOWithFullPrizePoolFixture() {
    let {cryptoKDO, contractOwner, owner, receiver, giver1, giver2, other, vRFCoordinatorV2Mock} = await loadFixture(deployCryptoKDOWithPrizePoolFixture)
    let amount = ethers.parseEther('0.1');
    await cryptoKDO.connect(giver1).donate(0, {value: amount});
    return {cryptoKDO, contractOwner, owner, receiver, giver1, giver2, other, vRFCoordinatorV2Mock, amount};
}

async function deployCryptoKDOWithTwoPrizePoolFixture() {
    let {cryptoKDO, contractOwner, owner, receiver, giver1, giver2, other, vRFCoordinatorV2Mock} = await loadFixture(deployCryptoKDOWithPrizePoolFixture);
    await cryptoKDO.connect(owner).createPrizePool(receiver, [giver1, giver2], "Prize Pool", "test prize pool");
    return {cryptoKDO, contractOwner, owner, receiver, giver1, giver2, other, vRFCoordinatorV2Mock}
}

async function deployCryptoKDOWithPassedTimeFixture() {
    let {cryptoKDO, contractOwner, owner, receiver, giver1, giver2, other, vRFCoordinatorV2Mock} = await loadFixture(deployCryptoKDOWithTwoPrizePoolFixture);
    await cryptoKDO.connect(giver1).donate(0, {value: ethers.parseEther('10')});
    await time.increase(3600 * 24 * 3);
    await cryptoKDO.connect(giver2).donate(1, {value: ethers.parseEther('5')});
    await time.increase(3600 * 24 * 7);
    await cryptoKDO.connect(contractOwner).updateRewards();
    await vRFCoordinatorV2Mock.connect(contractOwner).fulfillRandomWordsWithOverride(1,cryptoKDO,[1]);
    return {cryptoKDO, contractOwner, owner, receiver, giver1, giver2, other, vRFCoordinatorV2Mock}
}
  
describe('Test CryptoKDO Contract', function() {
  
    describe('Initialization', function() {
        it('should deploy the smart contract with empty prize pools', async function() {
          let {cryptoKDO, contractOwner} = await loadFixture(deployCryptoKDOFixture);
          await expect(cryptoKDO.connect(contractOwner).getPrizePool(0)).to.be.revertedWith("Any prize pool exist at index 0");
      });
    });
  
    describe('Basic functions', function() {
        describe('Get prize pool', function() {
            it('should get prize pool', async function() {
                let {cryptoKDO, contractOwner, owner, receiver, giver1, giver2} = await loadFixture(deployCryptoKDOFixture);
                await cryptoKDO.connect(owner).createPrizePool(receiver.address, [giver1.address], "Prize Pool", "test prize pool");
                await cryptoKDO.connect(owner).createPrizePool(receiver.address, [giver2.address], "Prize Pool", "test prize pool");
                let prizePool1 = await cryptoKDO.connect(contractOwner).getPrizePool(0);
                let prizePool2 = await cryptoKDO.connect(contractOwner).getPrizePool(1);
                assert.deepEqual(prizePool1, [0n, owner.address, receiver.address, "Prize Pool", "test prize pool", [giver1.address]]);
                assert.deepEqual(prizePool2, [0n, owner.address, receiver.address, "Prize Pool", "test prize pool", [giver2.address]]);
            });
            it('should get total prize pools', async function() {
                let {cryptoKDO, contractOwner, owner, receiver, giver1, giver2} = await loadFixture(deployCryptoKDOFixture);
                await cryptoKDO.connect(owner).createPrizePool(receiver.address, [giver1.address], "Prize Pool", "test prize pool");
                await cryptoKDO.connect(owner).createPrizePool(receiver.address, [giver2.address], "Prize Pool", "test prize pool");
                let totalPrizePools = await cryptoKDO.connect(contractOwner).getTotalPrizePools();
                assert.equal(totalPrizePools, 2);
            });
            it('should get all prize pools', async function() {
                let {cryptoKDO, contractOwner, owner, receiver, giver1, giver2} = await loadFixture(deployCryptoKDOFixture);
                await cryptoKDO.connect(owner).createPrizePool(receiver.address, [giver1.address], "Prize Pool", "test prize pool");
                await cryptoKDO.connect(owner).createPrizePool(receiver.address, [giver2.address], "Prize Pool", "test prize pool");
                let prizePools = await cryptoKDO.connect(contractOwner).getAllPrizePools();
                assert.deepEqual(prizePools, [[0n, owner.address, receiver.address, "Prize Pool", "test prize pool", [giver1.address]], [0n, owner.address, receiver.address, "Prize Pool", "test prize pool", [giver2.address]]]);
            });
            it('should get last time lottery', async function() {
                let {cryptoKDO, contractOwner} = await loadFixture(deployCryptoKDOFixture);
                let lastTimeLotteryBefore = await cryptoKDO.connect(contractOwner).lastLotteryTimestamp();
                await time.increase(3600 * 24 * 10);
                await cryptoKDO.connect(contractOwner).updateRewards();
                let lastTimeLotteryAfter = await cryptoKDO.connect(contractOwner).lastLotteryTimestamp();
                assert.equal(lastTimeLotteryAfter, lastTimeLotteryBefore + 3600n * 24n * 10n);
            });
            it('should get winning prize pool id', async function() {
                let {cryptoKDO, contractOwner, owner, receiver, giver1, giver2, other, vRFCoordinatorV2Mock} = await loadFixture(deployCryptoKDOFixture);
                await cryptoKDO.connect(owner).createPrizePool(receiver.address, [giver1.address], "Prize Pool", "test prize pool");
                await cryptoKDO.connect(owner).createPrizePool(receiver.address, [giver2.address], "Prize Pool", "test prize pool");
                await time.increase(3600 * 24 * 10);
                await cryptoKDO.connect(contractOwner).updateRewards();
                await vRFCoordinatorV2Mock.connect(contractOwner).fulfillRandomWordsWithOverride(1,cryptoKDO,[1]);
                let winningPrizePoolId = await cryptoKDO.connect(contractOwner).winningPrizePoolId();
                assert.equal(winningPrizePoolId, 1);
            });
            it('should get current supply', async function() {
                let {cryptoKDO, contractOwner, owner, receiver, giver1, giver2} = await loadFixture(deployCryptoKDOFixture);
                await cryptoKDO.connect(owner).createPrizePool(receiver.address, [giver1.address], "Prize Pool", "test prize pool");
                await cryptoKDO.connect(owner).createPrizePool(receiver.address, [giver2.address], "Prize Pool", "test prize pool");
                await cryptoKDO.connect(giver1).donate(0, {value : ethers.parseEther('0.005')});
                await cryptoKDO.connect(giver2).donate(1, {value : ethers.parseEther('0.005')});
                let totalSupply = await cryptoKDO.connect(contractOwner).currentSupply();
                assert.equal(totalSupply, ethers.parseEther('0.01'));
            });
            it('should get current reward', async function() {
                let {cryptoKDO, contractOwner, owner, receiver, giver1, giver2} = await loadFixture(deployCryptoKDOFixture);
                await cryptoKDO.connect(owner).createPrizePool(receiver.address, [giver1.address], "Prize Pool", "test prize pool");
                await cryptoKDO.connect(owner).createPrizePool(receiver.address, [giver2.address], "Prize Pool", "test prize pool");
                await cryptoKDO.connect(giver1).donate(0, {value : ethers.parseEther('0.005')});
                await cryptoKDO.connect(giver2).donate(1, {value : ethers.parseEther('0.005')});
                await time.increase(3600 * 24 * 1);
                await cryptoKDO.connect(contractOwner).updateRewards();
                let totalSupply = await cryptoKDO.connect(contractOwner).reward();
                assert.equal(totalSupply, ethers.parseEther('0.001'));
            });
        });
        describe('Create prize pool', function() {
            it('should not create a prize pool without a receiver', async function() {
                let {cryptoKDO, owner} = await loadFixture(deployCryptoKDOFixture);
                await expect(cryptoKDO.connect(owner).createPrizePool('0x0000000000000000000000000000000000000000',[], "Prize Pool", "test prize pool")).to.be.revertedWith("You cannot create prize pool without receiver");
            });
            it('should not create a prize pool without a giver', async function() {
                let {cryptoKDO, owner, receiver} = await loadFixture(deployCryptoKDOFixture);
                await expect(cryptoKDO.connect(owner).createPrizePool(receiver,[], "Prize Pool", "test prize pool")).to.be.revertedWith("You cannot create prize pool without giver");
            });
            it('should not create a prize pool without a title', async function() {
                let {cryptoKDO, owner, receiver} = await loadFixture(deployCryptoKDOFixture);
                await expect(cryptoKDO.connect(owner).createPrizePool(receiver,[giver1], "", "test prize pool")).to.be.revertedWith("You cannot create prize pool without title");
            });
            it('should create an empty prize pool with a receiver and at least a giver', async function() {
                let {cryptoKDO, contractOwner, owner, receiver, giver1} = await loadFixture(deployCryptoKDOFixture);
                await expect(cryptoKDO.connect(owner).createPrizePool(receiver,[giver1], "Prize Pool", "test prize pool")).to.emit(cryptoKDO, 'PrizePoolCreated').withArgs(0, owner, receiver, [giver1], "Prize Pool", "test prize pool");
                let prizePool = await cryptoKDO.connect(contractOwner).getPrizePool(0);
                assert.deepEqual(prizePool, [0n, owner.address, receiver.address, "Prize Pool", "test prize pool", [giver1.address]]);
            });
    
            it('should create an empty prize pool with a receiver and two givers', async function() {
                let {cryptoKDO, contractOwner, owner, receiver, giver1, giver2} = await loadFixture(deployCryptoKDOFixture);
                await expect(cryptoKDO.connect(owner).createPrizePool(receiver,[giver1, giver2], "Prize Pool", "test prize pool")).to.emit(cryptoKDO, 'PrizePoolCreated').withArgs(0, owner, receiver, [giver1, giver2], "Prize Pool", "test prize pool");
                let prizePool = await cryptoKDO.connect(contractOwner).getPrizePool(0);
                assert.deepEqual(prizePool, [0n, owner.address, receiver.address, "Prize Pool", "test prize pool", [giver1.address, giver2.address]]);
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
                let totalSupply = await cryptoKDO.connect(giver1).currentSupply();
                let giver1BalanceAfter = await ethers.provider.getBalance(giver1.address);
                assert.equal(prizePoolBalance, ethers.parseEther('0.003'));
                assert.equal(totalSupply, ethers.parseEther('0.003'));
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
                let totalSupply = await cryptoKDO.connect(giver1).currentSupply();
                assert.equal(prizePoolBalance, ethers.parseEther('0.31'));
                assert.equal(totalSupply, ethers.parseEther('0.31'));
                expect(giver1BalanceAfter).to.be.approximately(giver1BalanceBefore - prizePoolBalance + ethers.parseEther('0.2'), 1000000000000000n);
                expect(giver2BalanceAfter).to.be.approximately(giver2BalanceBefore - prizePoolBalance + ethers.parseEther('0.11'), 1000000000000000n);
            });
        });
  
        describe('Close prize pool', function() {
            it('should not close prize pool if not the owner', async function() {
                let {cryptoKDO, other} = await loadFixture(deployCryptoKDOWithFullPrizePoolFixture);
                await expect(cryptoKDO.connect(other).closePrizePool(0)).to.be.revertedWith("You cannot close prize pool if you are not owner");
            });
    
            it('should close prize pool if owner', async function() {
                let {cryptoKDO, owner, receiver, giver1, giver2, amount} = await loadFixture(deployCryptoKDOWithFullPrizePoolFixture);
                let receiverBalanceBefore = await ethers.provider.getBalance(receiver.address);
                let prizePoolBalance = (await cryptoKDO.connect(owner).getPrizePool(0)).amount;
                await expect(cryptoKDO.connect(owner).closePrizePool(0)).to.emit(cryptoKDO, 'PrizePoolClosed').withArgs([amount, owner, receiver, "Prize Pool", "test prize pool", [giver1, giver2]]);
                await expect(cryptoKDO.connect(owner).getPrizePool(0)).to.be.revertedWith("Any prize pool exist at index 0");
                let receiverBalanceAfter = await ethers.provider.getBalance(receiver.address);
                assert.equal(prizePoolBalance, amount);
                assert.equal(receiverBalanceAfter,receiverBalanceBefore + prizePoolBalance);
            });
        });
    });

    describe('Prize pools draw', function() {
        it('should draw a prize pool', async function() {
            let {cryptoKDO, vRFCoordinatorV2Mock, contractOwner} = await loadFixture(deployCryptoKDOWithTwoPrizePoolFixture);
            await time.increase(3600 * 24 *10);
            await cryptoKDO.connect(contractOwner).updateRewards();
            let prizePoolLength = await cryptoKDO.connect(contractOwner).getTotalPrizePools();
            assert.equal(prizePoolLength, 2);
            await expect(vRFCoordinatorV2Mock.connect(contractOwner).fulfillRandomWordsWithOverride(1,cryptoKDO,[1])).not.to.be.reverted;
            let winningPrizePool = await cryptoKDO.connect(contractOwner).winningPrizePoolId();
            assert.equal(winningPrizePool, 1);
        })
    })

    describe('Rewards actualisation', function() {
        it('should get total supply with reward', async function() {
            let {cryptoKDO, owner} = await loadFixture(deployCryptoKDOWithPassedTimeFixture);
            let totalSupply = await cryptoKDO.connect(owner).currentSupply();
            assert.equal(totalSupply, ethers.parseEther('35.681010101'));
        })
        it('should get a prize pool with reward', async function() {
            let {cryptoKDO, owner} = await loadFixture(deployCryptoKDOWithPassedTimeFixture);
            let prizePoolBalance = (await cryptoKDO.connect(owner).getPrizePool(1)).amount;
            assert.equal(prizePoolBalance, ethers.parseEther('25.681010101'));
        })
        it('should get all prize pools with reward', async function() {
            let {cryptoKDO, owner} = await loadFixture(deployCryptoKDOWithPassedTimeFixture);
            let prizePools = await cryptoKDO.connect(owner).getAllPrizePools();
            assert.equal(prizePools[0].amount, ethers.parseEther('10'));
            assert.equal(prizePools[1].amount, ethers.parseEther('25.681010101'));
        })
        it('should close prize pools with reward', async function() {
            let {cryptoKDO, owner, receiver} = await loadFixture(deployCryptoKDOWithPassedTimeFixture);
            let receiverBalanceBefore = await ethers.provider.getBalance(receiver.address);
            await cryptoKDO.connect(owner).closePrizePool(0);
            let receiverBalanceBetween = await ethers.provider.getBalance(receiver.address);
            await cryptoKDO.connect(owner).closePrizePool(0);
            let receiverBalanceAfter = await ethers.provider.getBalance(receiver.address);
            assert.equal(receiverBalanceBetween, receiverBalanceBefore + ethers.parseEther('10'));
            assert.equal(receiverBalanceAfter, receiverBalanceBefore + ethers.parseEther('35.681010101'));
        })
    })

    
});
  
