const { buildModule } = require("@nomicfoundation/hardhat-ignition/modules");
const { ethers } = require('hardhat');

module.exports = buildModule("CryptoKDOModuleHardhat", (m) => {
  const erc20 = m.contract("ERC20Mock");
  const wtg = m.contract("WrappedTokenGatewayMock", [erc20], {value: ethers.parseEther('5000')});
  const cryptoKDO = m.contract("CryptoKDO", [wtg, erc20]);
  return { cryptoKDO };
});
