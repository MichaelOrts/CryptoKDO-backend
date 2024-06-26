const { buildModule } = require("@nomicfoundation/hardhat-ignition/modules");

module.exports = buildModule("CryptoKDOModule", (m) => {
  const cryptoKDO = m.contract("CryptoKDO");
  return { cryptoKDO };
});
