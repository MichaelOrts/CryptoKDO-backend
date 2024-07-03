require("@nomicfoundation/hardhat-toolbox");
require("@nomicfoundation/hardhat-verify");
require('dotenv').config()
const ALCHEMY = process.env.ALCHEMY || "";
const PK = process.env.PK || "0x00000000000000000000000000000000000000000000000000000000000000";
const ETHERSCAN = process.env.ETHERSCAN || "";

module.exports = {
  solidity: "0.8.24",
  defaultNetwork: "hardhat",
  networks: {
    sepolia: {
      url: ALCHEMY,
      accounts: [`0x${PK}`],
      chainId: 11155111
    },
    hardhat: {
      chainId: 31337,
    }
  },
  etherscan: {
    apiKey: ETHERSCAN
  },
};