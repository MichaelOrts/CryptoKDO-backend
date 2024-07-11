const { time, loadFixture } = require("@nomicfoundation/hardhat-toolbox/network-helpers");
const { expect, assert } = require("chai");
const { ethers } = require('hardhat');
  
async function deployCryptoKDOFixture() {
    [contractOwner, owner, receiver, giver1, giver2] = await ethers.getSigners();
    let contract = await ethers.getContractFactory('CryptoKDO');
    let eRC20Contract = await ethers.getContractFactory('ERC20Mock');
    let wtgContract = await ethers.getContractFactory('WrappedTokenGatewayMock');
    eRC20 = await eRC20Contract.deploy();
    wtg = await wtgContract.deploy(eRC20,{value : ethers.parseEther('1000')});
    cryptoKDO = await contract.deploy(wtg, eRC20,0,'0x0000000000000000000000000000000000000000',"0xd89b2bf150e3b9e13446986e571fb9cab24b13cea0a43ea20a6049a85cc807cc");
    return {cryptoKDO, contractOwner, owner, receiver, giver1, giver2};
}

async function deployCryptoKDOWithPrizePoolFixture() {
    [contractOwner, owner, receiver, giver1, giver2, other] = await ethers.getSigners();
    let contract = await ethers.getContractFactory('CryptoKDO');
    let eRC20Contract = await ethers.getContractFactory('ERC20Mock');
    let wtgContract = await ethers.getContractFactory('WrappedTokenGatewayMock');
    eRC20 = await eRC20Contract.deploy();
    wtg = await wtgContract.deploy(eRC20,{value : ethers.parseEther('1000')});
    cryptoKDO = await contract.deploy(wtg, eRC20,0,'0x0000000000000000000000000000000000000000',"0xd89b2bf150e3b9e13446986e571fb9cab24b13cea0a43ea20a6049a85cc807cc");
    await cryptoKDO.connect(owner).createPrizePool(receiver, [giver1, giver2], "Prize Pool", "test prize pool");
    return {cryptoKDO, giver1, giver2, other};
}

async function deployCryptoKDOWithFullPrizePoolFixture() {
    [contractOwner, owner, receiver, giver1, giver2, other] = await ethers.getSigners();
    let contract = await ethers.getContractFactory('CryptoKDO');
    let amount = ethers.parseEther('0.1');
    let eRC20Contract = await ethers.getContractFactory('ERC20Mock');
    let wtgContract = await ethers.getContractFactory('WrappedTokenGatewayMock');
    eRC20 = await eRC20Contract.deploy();
    wtg = await wtgContract.deploy(eRC20,{value : ethers.parseEther('1000')});
    cryptoKDO = await contract.deploy(wtg, eRC20,0,'0x0000000000000000000000000000000000000000',"0xd89b2bf150e3b9e13446986e571fb9cab24b13cea0a43ea20a6049a85cc807cc");
    await cryptoKDO.connect(owner).createPrizePool(receiver, [giver1, giver2], "Prize Pool", "test prize pool");
    await cryptoKDO.connect(giver1).donate(0, {value: amount});
    return {cryptoKDO, owner, receiver, giver1, giver2, other, amount};
}

async function deployCryptoKDOWithPassedTimeFixture() {
    [contractOwner, owner, receiver, giver1, giver2] = await ethers.getSigners();
    let contract = await ethers.getContractFactory('CryptoKDO');
    let amount = ethers.parseEther('0.1');
    let eRC20Contract = await ethers.getContractFactory('ERC20Mock');
    let wtgContract = await ethers.getContractFactory('WrappedTokenGatewayMock');
    eRC20 = await eRC20Contract.deploy();
    wtg = await wtgContract.deploy(eRC20,{value : ethers.parseEther('1000')});
    cryptoKDO = await contract.deploy(wtg, eRC20,0,'0x0000000000000000000000000000000000000000',"0xd89b2bf150e3b9e13446986e571fb9cab24b13cea0a43ea20a6049a85cc807cc");
    await cryptoKDO.connect(owner).createPrizePool(receiver, [giver1, giver2], "Prize Pool", "test prize pool");
    await cryptoKDO.connect(owner).createPrizePool(receiver, [giver1, giver2], "Prize Pool", "test prize pool");
    await cryptoKDO.connect(giver1).donate(0, {value: amount});
    await time.increase(3600 * 24);
    await cryptoKDO.connect(giver2).donate(1, {value: amount * 2n});
    await time.increase(3600 * 24 * 2);
    return {cryptoKDO, owner, receiver};
}

async function deployCryptoKDOWithVRFCoordinatorFixture() {
    [contractOwner, other] = await ethers.getSigners();
    let contract = await ethers.getContractFactory('CryptoKDO');
    let eRC20Contract = await ethers.getContractFactory('ERC20Mock');
    let wtgContract = await ethers.getContractFactory('WrappedTokenGatewayMock');
    let vRFCoordinatorV2MockContract = await ethers.getContractFactory('VRFCoordinatorV2Mock');

    const BASE_FEE = "1000000000000000";
    const GAS_PRICE_LINK = "1000000000";
    const FUND = "1000000000000000000";
    const SUB_ID = 1;
    const KEY_HASH = "0xd89b2bf150e3b9e13446986e571fb9cab24b13cea0a43ea20a6049a85cc807cc";

    const vRFCoordinatorV2Mock = await vRFCoordinatorV2MockContract.deploy(
        BASE_FEE,
        GAS_PRICE_LINK
    );
    
    await vRFCoordinatorV2Mock.createSubscription();
    await vRFCoordinatorV2Mock.fundSubscription(SUB_ID, FUND);
    
    eRC20 = await eRC20Contract.deploy();
    wtg = await wtgContract.deploy(eRC20,{value : ethers.parseEther('1000')});
    cryptoKDO = await contract.deploy(wtg, eRC20, SUB_ID, vRFCoordinatorV2Mock, KEY_HASH);

    await cryptoKDO.connect(owner).createPrizePool(receiver, [giver1, giver2], "Prize Pool", "test prize pool");
    await cryptoKDO.connect(owner).createPrizePool(receiver, [giver1, giver2], "Prize Pool", "test prize pool");

    await vRFCoordinatorV2Mock.addConsumer(SUB_ID, cryptoKDO);

    return { cryptoKDO, vRFCoordinatorV2Mock, contractOwner }
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
            it('should get total supply', async function() {
                let {cryptoKDO, contractOwner, owner, receiver, giver1, giver2} = await loadFixture(deployCryptoKDOFixture);
                await cryptoKDO.connect(owner).createPrizePool(receiver.address, [giver1.address], "Prize Pool", "test prize pool");
                await cryptoKDO.connect(owner).createPrizePool(receiver.address, [giver2.address], "Prize Pool", "test prize pool");
                await cryptoKDO.connect(giver1).donate(0, {value : ethers.parseEther('0.005')});
                await cryptoKDO.connect(giver2).donate(1, {value : ethers.parseEther('0.005')});
                let totalSupply = await cryptoKDO.connect(contractOwner).getTotalSupply();
                assert.equal(totalSupply, ethers.parseEther('0.01'));
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
                let totalSupply = await cryptoKDO.connect(giver1).getTotalSupply();
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
                let totalSupply = await cryptoKDO.connect(giver1).getTotalSupply();
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

    describe('Rewards actualisation', function() {
        it('should get total supply with reward', async function() {
            let {cryptoKDO, owner} = await loadFixture(deployCryptoKDOWithPassedTimeFixture);
            let totalSupply = await cryptoKDO.connect(owner).getTotalSupply();
            assert.equal(totalSupply, ethers.parseEther('0.3751'));
        })
        it('should get a prize pool with reward', async function() {
            let {cryptoKDO, owner} = await loadFixture(deployCryptoKDOWithPassedTimeFixture);
            let prizePoolBalance = (await cryptoKDO.connect(owner).getPrizePool(1)).amount;
            expect(prizePoolBalance).to.be.approximately(ethers.parseEther('0.242'),1000000000000000n)
        })
        it('should get all prize pools with reward', async function() {
            let {cryptoKDO, owner} = await loadFixture(deployCryptoKDOWithPassedTimeFixture);
            let prizePools = await cryptoKDO.connect(owner).getAllPrizePools();
            expect(prizePools[0].amount).to.be.approximately(ethers.parseEther('0.1331'),1000000000000000n)
            expect(prizePools[1].amount).to.be.approximately(ethers.parseEther('0.242'),1000000000000000n)
        })
        it('should close prize pools with reward', async function() {
            let {cryptoKDO, owner, receiver} = await loadFixture(deployCryptoKDOWithPassedTimeFixture);
            let receiverBalanceBefore = await ethers.provider.getBalance(receiver.address);
            await cryptoKDO.connect(owner).closePrizePool(0);
            let receiverBalanceBetween = await ethers.provider.getBalance(receiver.address);
            await cryptoKDO.connect(owner).closePrizePool(0);
            let receiverBalanceAfter = await ethers.provider.getBalance(receiver.address);
            expect(receiverBalanceBetween).to.be.approximately(receiverBalanceBefore + ethers.parseEther('0.1331'),1000000000000000n)
            expect(receiverBalanceAfter).to.be.approximately(receiverBalanceBefore + ethers.parseEther('0.3751'),1000000000000000n)
        })
    })

    describe('Prize pools draw', function() {
        it('should draw a prize pool', async function() {
            let {cryptoKDO, vRFCoordinatorV2Mock, contractOwner} = await loadFixture(deployCryptoKDOWithVRFCoordinatorFixture);
            await expect(cryptoKDO.connect(contractOwner).prizePoolDraw()).not.to.be.reverted;
            let prizePoolLength = await cryptoKDO.connect(contractOwner).getTotalPrizePools();
            assert.equal(prizePoolLength, 2);
            await expect(vRFCoordinatorV2Mock.connect(contractOwner).fulfillRandomWordsWithOverride(1,cryptoKDO,[1])).not.to.be.reverted;
            let winningPrizePool = await cryptoKDO.connect(contractOwner).winningPrizePoolId();
            assert.equal(winningPrizePool, 1);
        })
    })
});
  
