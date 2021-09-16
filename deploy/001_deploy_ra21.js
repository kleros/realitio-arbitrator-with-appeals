module.exports = async ({ getNamedAccounts, deployments, getChainId, getUnnamedAccounts }) => {
  // INFURA_PROJECT_ID, PRIVATE_KEY and ETHERSCAN environment variables are required for this task. See Hardhat configuation for more information.

  const { deploy } = deployments;
  const accounts = await getUnnamedAccounts();
  const deployer = accounts[0];
  const chainId = await getChainId();
  const contractName = "Realitio_v2_1_ArbitratorWithAppeals";
  console.log(`Deployer: ${deployer}`);
  console.log(`Contract to be deployed: ${contractName}`);
  console.log(`Deploying to network ${chainId}.`);

  const KLEROS = { 42: "0x60B2AbfDfaD9c0873242f59f2A8c32A3Cc682f80" };
  const REALITIOv21 = { 42: "0x50E35A1ED424aB9C0B8C7095b3d9eC2fb791A168" };

  const ra21 = deploy(contractName, {
    from: deployer,
    gasLimit: 4000000,
    args: [REALITIOv21[chainId], "metadata", KLEROS[chainId], generateArbitratorExtraData(1, 1), "metaevidence"],
  });
  console.log("Tx sent. Waiting for confirmation.");
  const deployment = await ra21;
  // console.log(`Deployed at ${getExplorerLinkToContract(chainId, deployment.address)}.`);
  console.log("Trying to verify the source code on Etherscan.");

  await hre.run("verify:verify", {
    address: deployment.address,
    constructorArguments: deployment.args,
  });
};

function generateArbitratorExtraData(subcourtID, noOfVotes) {
  return `0x${parseInt(subcourtID, 10).toString(16).padStart(64, "0") + parseInt(noOfVotes, 10).toString(16).padStart(64, "0")}`;
}

function getExplorerLinkToContract(chainId, address) {
  switch (parseInt(chainId)) {
    case 42:
      return `https://kovan.etherscan.io/address/${address}`;
      break;
    default:
      console.error("Undefined chain id. Can't return a link to an explorer.");
      return address;
  }
}
