// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// When running the script with `npx hardhat run <script>` you'll find the Hardhat
// Runtime Environment's members available in the global scope.
const hre = require("hardhat");

const REALITIO = {
  kovan: "0x50E35A1ED424aB9C0B8C7095b3d9eC2fb791A168",
};

const KLEROS = {
  kovan: "0x60B2AbfDfaD9c0873242f59f2A8c32A3Cc682f80",
};

function generateArbitratorExtraData(subcourtID, noOfVotes) {
  return `0x${parseInt(subcourtID, 10).toString(16).padStart(64, "0") + parseInt(noOfVotes, 10).toString(16).padStart(64, "0")}`;
}

async function main() {
  // Hardhat always runs the compile task when running scripts with its command
  // line interface.
  //
  // If this script is run directly using `node` you may want to call compile
  // manually to make sure everything is compiled
  // await hre.run('compile');

  // We get the contract to deploy
  const RA21 = await hre.ethers.getContractFactory("Realitio_v2_1_ArbitratorWithAppeals");
  const ra21 = await RA21.deploy(REALITIO.kovan, "metadata", KLEROS.kovan, generateArbitratorExtraData(1, 1), "METAEVIDENCE");

  await ra21.deployed();

  console.log("RA21 deployed to:", ra21.address);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
