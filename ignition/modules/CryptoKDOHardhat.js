const { buildModule } = require("@nomicfoundation/hardhat-ignition/modules");
const { ethers } = require('hardhat');

module.exports = buildModule("CryptoKDOModuleHardhat", (m) => {
  const erc20 = m.contract("ERC20Mock");
  const wtg = m.contract("WrappedTokenGatewayMock", [erc20], {value: ethers.parseEther('5000')});
  const vrfCoordinator = m.contract('VRFCoordinatorV2Mock', [1000000000000000, 1000000000]);
  vrfCoordinator.createSubscription();
  vrfCoordinator.fundSubscription(1, 1000000000000000000);
  const cryptoKDO = m.contract("CryptoKDO", [wtg, erc20, 1, vrfCoordinator, "0x787d74caea10b2b357790d5b5247c2f63d1d91572a9846f780606e4d953677ae"]);
  vrfCoordinator.addConsumer(1, cryptoKDO);
  return { cryptoKDO };
});
