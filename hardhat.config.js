const { time } = require("@nomicfoundation/hardhat-toolbox/network-helpers");

require("@nomicfoundation/hardhat-toolbox");
require("@nomicfoundation/hardhat-verify");
require('dotenv').config()
const ALCHEMY = process.env.ALCHEMY || "";
const PK = process.env.PK || "";
const ETHERSCAN = process.env.ETHERSCAN || "";

if(PK){
  sepolia = {
    url: ALCHEMY,
    accounts: [`0x${PK}`],
    chainId: 11155111
  }
} else{
  sepolia = {
    url: ALCHEMY,
  }
}

module.exports = {
  solidity: {
    compilers: [
      {
        version: "0.8.19",
      },
      {
        version: "0.8.24",
      },
    ],
  },
  defaultNetwork: "hardhat",
  networks: {
    sepolia: sepolia,
    localhost: {
      url: "http://127.0.0.1:8545",
      chainId: 31337,
    },
    hardhat: {
      mining: {
        auto: true,
        interval: 1000
      }
    }
  },
  etherscan: {
    apiKey: ETHERSCAN
  },
};

task("timeTravel", "mines new block with timestamp increased by hours")
  .addParam("hours", "time to advance in hours")
  .setAction(async (taskArgs) => {
    await time.increase(3600 * taskArgs.hours);
  })