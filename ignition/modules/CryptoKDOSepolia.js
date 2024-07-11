const { buildModule } = require("@nomicfoundation/hardhat-ignition/modules");
const { ethers } = require('hardhat');

module.exports = buildModule("CryptoKDOModuleSepolia", (m) => {
  const erc20 = "0x5b071b590a59395fE4025A0Ccc1FcC931AAc1830";
  const wtg = "0x387d311e47e80b498169e6fb51d3193167d89F7D"
  const cryptoKDO = m.contract("CryptoKDO", [wtg, erc20]);
  return { cryptoKDO };
});
