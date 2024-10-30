module.exports = async ({ deployments, getChainId, getUnnamedAccounts }) => {
  // INFURA_PROJECT_ID, PRIVATE_KEY and ETHERSCAN environment variables are required for this task. See Hardhat configuation for more information.
  const sleepDuration = 10000;

  const SUBCOURT = 0;
  const NUMBER_OF_VOTES = 31;

  const chainId = await getChainId();


  const KLEROS = { 
    1: "0x988b3A538b618C7A603e1c11Ab82Cd16dbE28069",
    10200: "0xD8798DfaE8194D6B4CD6e2Da6187ae4209d06f27",
    11155111: "0x90992fb4E15ce0C59aEFfb376460Fda4Ee19C879",
    100: "0x9C1dA9A04925bDfDedf0f6421bC7EEa8305F9002"
  };
  const REALITIOv30 = { 
    1: "0x5b7dD1E86623548AF054A4985F7fc8Ccbb554E2c",
    10200: "0x1E732a1C5e9181622DD5A931Ec6801889ce66185",
    11155111: "0xaf33DcB6E8c5c4D9dDF579f53031b514d19449CA",
    100: "0xE78996A233895bE74a66F451f1019cA9734205cc"
  };

  // Note, replace with the relevant primary doc
  const primaryDocumentIPFSPath = "QmPmRkXFUmzP4rq2YfD3wNwL8bg3WDxkYuvTP9A9UZm9gJ/seer-markets-resolution-policy.pdf";

  const metadata = {
    tos: `ipfs://${primaryDocumentIPFSPath}`,
  };

  // Note, replace with the relevant metaevidence file
  const metaevidenceURI = `/ipfs/QmX23a3udkA3UBxrAkVJfYbKQ33AayoLZuWf3f31j4A3kF`;

  if (chainId == 1) {
    console.log(`Going to try proceed with deployment in ${(3 * sleepDuration) / 1000} seconds. Please verify arguments.`);
    await new Promise((resolve) => setTimeout(resolve, 3 * sleepDuration));
  }

  const { deploy } = deployments;
  const accounts = await getUnnamedAccounts();
  const deployer = accounts[0];
  const contractName = "Realitio_v2_1_ArbitratorWithAppeals";
  const ra21 = deploy(contractName, {
    from: deployer,
    gasLimit: 4000000,
    gasPrice: 20000000000, // 20 gwei
    args: [REALITIOv30[chainId], JSON.stringify(metadata), KLEROS[chainId], generateArbitratorExtraData(SUBCOURT, NUMBER_OF_VOTES), metaevidenceURI],
  });
  console.log("Tx sent. Waiting for confirmation.");

  const deployment = await ra21;
  console.log(deployment.address);

  console.log(`Going to try verifying the source code on Etherscan in ${sleepDuration / 1000} seconds.`);

  await new Promise((resolve) => setTimeout(resolve, sleepDuration));
  console.log("Trying to verify now.");
  await hre.run("verify:verify", {
    address: deployment.address,
    constructorArguments: deployment.args,
  });
};

function generateArbitratorExtraData(subcourtID, noOfVotes) {
  return `0x${parseInt(subcourtID, 10).toString(16).padStart(64, "0") + parseInt(noOfVotes, 10).toString(16).padStart(64, "0")}`;
}
