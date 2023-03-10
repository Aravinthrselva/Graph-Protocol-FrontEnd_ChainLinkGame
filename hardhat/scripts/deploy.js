const {ethers} =require("hardhat");

require("dotenv").config({path:".env"});

const {LINK_TOKEN, VRF_COORDINATOR, KEY_HASH, FEE} = require("../constants");

async function main() {

  /*
 A ContractFactory in ethers.js is an abstraction used to deploy new smart contracts,
 so randomWinnerGame here is a factory for instances of our RandomWinnerGame contract.
 */

 const randomWinnerGame = await ethers.getContractFactory("RandomWinnerGame");

 const deployedRandomWinnerGameContract = await randomWinnerGame.deploy(VRF_COORDINATOR, LINK_TOKEN, KEY_HASH, FEE);

 await deployedRandomWinnerGameContract.deployed();

 console.log("Verify Contract Address: ", deployedRandomWinnerGameContract.address);
 console.log("sleeping..");
 // Wait for etherscan to notice that the contract has been deployed
 await sleep(30000);

 // Verify the contract after deploying
 await hre.run("verify:verify", {
  address: deployedRandomWinnerGameContract.address,
  constructorArguments: [VRF_COORDINATOR, LINK_TOKEN, KEY_HASH, FEE],
 });
                                          
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });