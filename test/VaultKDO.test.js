const { time, loadFixture } = require("@nomicfoundation/hardhat-toolbox/network-helpers");
const { expect, assert } = require("chai");
const { ethers } = require('hardhat');
  
async function deployVaultKDOFixture() {
    [contractOwner, other] = await ethers.getSigners();
    let contract = await ethers.getContractFactory('VaultKDO');
    let eRC20Contract = await ethers.getContractFactory('ERC20Mock');
    let wtgContract = await ethers.getContractFactory('WrappedTokenGatewayMock');
    eRC20 = await eRC20Contract.deploy();
    wtg = await wtgContract.deploy(eRC20,{value : ethers.parseEther('1000')});
    vaultKDO = await contract.deploy(wtg, eRC20,0,'0x0000000000000000000000000000000000000000',"0xd89b2bf150e3b9e13446986e571fb9cab24b13cea0a43ea20a6049a85cc807cc");
    return {vaultKDO, contractOwner, other};
}

async function deployVaultKDOWithDepositFixture() {
    [contractOwner, other] = await ethers.getSigners();
    let contract = await ethers.getContractFactory('VaultKDO');
    let eRC20Contract = await ethers.getContractFactory('ERC20Mock');
    let wtgContract = await ethers.getContractFactory('WrappedTokenGatewayMock');
    eRC20 = await eRC20Contract.deploy();
    wtg = await wtgContract.deploy(eRC20,{value : ethers.parseEther('1000')});
    vaultKDO = await contract.deploy(wtg, eRC20,0,'0x0000000000000000000000000000000000000000',"0xd89b2bf150e3b9e13446986e571fb9cab24b13cea0a43ea20a6049a85cc807cc");
    await vaultKDO.connect(contractOwner).deposit({value: ethers.parseEther('1')})
    return {vaultKDO, contractOwner, other};
}

async function deployVaultKDOWithVRFCoordinatorFixture() {
    [contractOwner, other] = await ethers.getSigners();
    let contract = await ethers.getContractFactory('VaultKDO');
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
    vaultKDO = await contract.deploy(wtg, eRC20, SUB_ID, vRFCoordinatorV2Mock, KEY_HASH);

    await vRFCoordinatorV2Mock.addConsumer(SUB_ID, vaultKDO);

    return { vaultKDO, vRFCoordinatorV2Mock, contractOwner }
}


describe('Test VaultKDO Contract', function() {
  
    describe('Initialization', function() {
        it('should deploy the smart contract with owner', async function() {
            let {vaultKDO, contractOwner} = await loadFixture(deployVaultKDOFixture);
            let theOwner = await vaultKDO.owner();
            assert.equal(contractOwner.address, theOwner);
        })
    })
    describe('Basic functions', function() {
        describe('Deposit', function() {
            it('should not deposit if not owner', async function() {
                let {vaultKDO, contractOwner, other} = await loadFixture(deployVaultKDOFixture);
                await expect(vaultKDO.connect(other).deposit({value: ethers.parseEther('1')})).to.be.revertedWithCustomError(vaultKDO,'OwnableUnauthorizedAccount').withArgs(other);
            })
            it('should deposit amount if owner', async function() {
                let {vaultKDO, contractOwner} = await loadFixture(deployVaultKDOFixture);
                await expect(vaultKDO.connect(contractOwner).deposit({value: ethers.parseEther('1')})).to.emit(vaultKDO, 'DepositDone').withArgs(ethers.parseEther('1'));
                let balance = await vaultKDO.connect(contractOwner).getSupply();
                assert.equal(balance, ethers.parseEther('1'));
            })
        })
        
        describe('Get supply', function() {
            it('should not get total deposit if not owner', async function() {
                let {vaultKDO, contractOwner, other} = await loadFixture(deployVaultKDOWithDepositFixture);
                await expect(vaultKDO.connect(other).getSupply()).to.be.revertedWithCustomError(vaultKDO,'OwnableUnauthorizedAccount').withArgs(other);
            })
            it('should get total deposit if owner', async function() {
                let {vaultKDO, contractOwner} = await loadFixture(deployVaultKDOWithDepositFixture);
                let balance = await vaultKDO.connect(contractOwner).getSupply();
                assert.equal(balance, ethers.parseEther('1'));
            })
        })

        describe('Withdraw', function() {
            it('should not withdraw if not owner', async function() {
                let {vaultKDO, contractOwner, other} = await loadFixture(deployVaultKDOWithDepositFixture);
                await expect(vaultKDO.connect(other).withdraw(ethers.parseEther('1'))).to.be.revertedWithCustomError(vaultKDO,'OwnableUnauthorizedAccount').withArgs(other);
            })
            it('should withdraw if owner', async function() {
                let {vaultKDO, contractOwner} = await loadFixture(deployVaultKDOWithDepositFixture);
                let contractOwnerBalanceBefore = await ethers.provider.getBalance(contractOwner.address);
                await expect(vaultKDO.connect(contractOwner).withdraw(ethers.parseEther('1'))).to.emit(vaultKDO, 'WithdrawDone').withArgs(ethers.parseEther('1'));
                let contractOwnerBalanceAfter = await ethers.provider.getBalance(contractOwner.address);
                let balance = await vaultKDO.connect(contractOwner).getSupply();
                assert.equal(balance, ethers.parseEther('0'));
                expect(contractOwnerBalanceAfter).to.be.approximately(contractOwnerBalanceBefore + ethers.parseEther('1'), 1000000000000000n);
            })
        })
    })
    describe('Get rewards', function() {
        it('should get reward if staking duration is enough', async function() {
            let {vaultKDO, contractOwner} = await loadFixture(deployVaultKDOWithDepositFixture);
            let contractOwnerBalanceBefore = await ethers.provider.getBalance(contractOwner.address);
            let balance = await vaultKDO.connect(contractOwner).getSupply();
            assert.equal(balance, ethers.parseEther('1'));
            await time.increase(3600 * 24);
            balance = await vaultKDO.connect(contractOwner).getSupply();
            assert.equal(balance, ethers.parseEther('1.1'));
            await time.increase(3600 * 24 * 3);
            balance = await vaultKDO.connect(contractOwner).getSupply();
            assert.equal(balance, ethers.parseEther('1.4641'));
            await expect(vaultKDO.connect(contractOwner).withdraw(ethers.parseEther('1.4641'))).to.emit(vaultKDO, 'WithdrawDone').withArgs(ethers.parseEther('1.4641'));
            let contractOwnerBalanceAfter = await ethers.provider.getBalance(contractOwner.address);
            balance = await vaultKDO.connect(contractOwner).getSupply();
            assert.equal(balance, ethers.parseEther('0'));
            expect(contractOwnerBalanceAfter).to.be.approximately(contractOwnerBalanceBefore + ethers.parseEther('1.4641'), 1000000000000000n);
        })
    })

    describe('Prize pools draw', function() {
        it('should draw a prize pool', async function() {
            let {vaultKDO, vRFCoordinatorV2Mock, contractOwner} = await loadFixture(deployVaultKDOWithVRFCoordinatorFixture);
            await expect(vaultKDO.connect(contractOwner).prizePoolDraw(10)).not.to.be.reverted;
            let prizePoolLength = await vaultKDO.connect(contractOwner).prizePoolsLength();
            assert.equal(prizePoolLength, 10);
            await expect(vRFCoordinatorV2Mock.connect(contractOwner).fulfillRandomWordsWithOverride(1,vaultKDO,[5])).not.to.be.reverted;
            let winningPrizePool = await vaultKDO.connect(contractOwner).winningPrizePoolId();
            assert.equal(winningPrizePool, 5);
        })
    })
})