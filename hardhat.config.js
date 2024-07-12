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
    console.log("done");
  })

  task("random", "call vrf to generate words")
  .addParam("vrf", "vrf address")
  .addParam("consumer", "consumer address")
  .addParam("id", "request id")
  .addOptionalParam("value", "set value generated")
  .setAction(async (taskArgs) => {
    const VRFContract = await ethers.getContractFactory("VRFCoordinatorV2Mock");
    const vrf = await VRFContract.attach(taskArgs.vrf);
    if(taskArgs.value != undefined){
      await vrf.fulfillRandomWordsWithOverride(taskArgs.id, taskArgs.consumer, [taskArgs.value]);
    }else{
      await vrf.fulfillRandomWords(taskArgs.id, taskArgs.consumer);
    }
    console.log("done");
  })