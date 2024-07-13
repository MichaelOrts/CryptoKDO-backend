const { buildModule } = require("@nomicfoundation/hardhat-ignition/modules");
const { ethers } = require('hardhat');

module.exports = buildModule("CryptoKDOModuleSepolia", (m) => {
  const ERC_20 = "0x5b071b590a59395fE4025A0Ccc1FcC931AAc1830";
  const WTG = "0x387d311e47e80b498169e6fb51d3193167d89F7D";
  const SUBSCRIPTION_ID = 12028;
  const COORDINATOR = "0xC13B6a482ab6A7d6e4D802c7d8Be1f67985980C8";
  const KEY_HASH = "0x787d74caea10b2b357790d5b5247c2f63d1d91572a9846f780606e4d953677ae";
  const cryptoKDO = m.contract("CryptoKDO", [WTG, ERC_20, SUBSCRIPTION_ID, COORDINATOR, KEY_HASH]);
  return { cryptoKDO };
});
