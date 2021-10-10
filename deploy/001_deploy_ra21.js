const { BN, Address, toChecksumAddress } = require("ethereumjs-util");
const fetch = require("node-fetch");

module.exports = async ({ getNamedAccounts, deployments, getChainId, getUnnamedAccounts, ethers, config }) => {
  // INFURA_PROJECT_ID, PRIVATE_KEY and ETHERSCAN environment variables are required for this task. See Hardhat configuation for more information.
  const chainId = await getChainId();

  const KLEROS = { 1: "0x988b3A538b618C7A603e1c11Ab82Cd16dbE28069", 42: "0x60B2AbfDfaD9c0873242f59f2A8c32A3Cc682f80" };
  const REALITIOv21 = { 42: "0x50E35A1ED424aB9C0B8C7095b3d9eC2fb791A168" };
  const REALITIOv30 = { 1: "0x5b7dD1E86623548AF054A4985F7fc8Ccbb554E2c", 42: "0xcB71745d032E16ec838430731282ff6c10D29Dea" };

  const primaryDocumentIPFSPath = "QmXyo9M4Z2XY6Nw9UfuuUNzKXXNhvt24q6pejuN9RYWPMr/Reality_Module_Governance_Oracle-Question_Resolution_Policy.pdf";
  const templateHashes = [
    "0x2630d91f54445fa42ec6738610b1a4c52b08a197156ab2ed97e4e17201528f2f",
    "0xf006792a99a5de2495a30060356c53fdfd8cd04c53ad3402c5353035dc6b9589",
    "0xe49d22c3fb3eac70dc2d9d76aa17b7e4b487f2f4b7c683f3705b638453520000",
    "0x1d41a41b7d3550c01209c10495988bfa01dd2e86c5a3fae5f9dbc2ccde20c1a9",
    "0x5b13a2ad9e4dfbf057ecf2c35d4152b61718a3ab46a14db63feb17b1515749ba",
  ];

  const metadata = {
    tos: `ipfs://${primaryDocumentIPFSPath}`,
  };

  const metaevidence = {
    category: "Oracle",
    title: "A reality.eth question",
    description: "A reality.eth question has been raised to arbitration.",
    question: "Give an answer to the question.",
    evidenceDisplayInterfaceURI: "/ipfs/QmWCmzMB4zbzii8HV9HFGa8Evgt5i63GyveJtw2umxRrcX/reality-evidence-display-4/index.html",
    dynamicScriptURI: "/ipfs/QmWWsDmvjhR9UVRgkcG75vAKzfK3vB85EkZzudnaxwfAWr/bundle.js",
    fileURI: `/ipfs/${primaryDocumentIPFSPath}`,
    arbitrableChainID: chainId,
    arbitratorChainID: chainId,
    dynamicScriptRequiredParams: ["arbitrableChainID", "arbitrableJsonRpcUrl", "arbitrableContractAddress"],
    evidenceDisplayInterfaceRequiredParams: ["arbitrableChainID", "arbitrableJsonRpcUrl", "arbitrableContractAddress"],
  };
  const ipfsHashMetaEvidenceObj = await ipfsPublish("metaEvidence.json", new TextEncoder().encode(JSON.stringify(metaevidence)));
  const metaevidenceURI = `/ipfs/${ipfsHashMetaEvidenceObj[1].hash}${ipfsHashMetaEvidenceObj[0].path}`;
  console.log(`Metaevidence deployed at: https://ipfs.kleros.io${metaevidenceURI}`);

  const { deploy } = deployments;
  const { providers } = ethers;
  const networks = {
    42: config.networks.kovan,
    1: config.networks.main,
  };
  const web3provider = new providers.JsonRpcProvider(networks[chainId]);
  const accounts = await getUnnamedAccounts();
  const deployer = accounts[0];
  const contractName = "Realitio_v2_1_ArbitratorWithAppeals";

  const ra21 = deploy(contractName, {
    from: deployer,
    gasLimit: 4000000,
    args: [REALITIOv30[chainId], JSON.stringify(metadata), KLEROS[chainId], generateArbitratorExtraData(4, 5), metaevidenceURI],
  });
  console.log("Tx sent. Waiting for confirmation.");

  const deployment = await ra21;
  // console.log(`Deployed at ${getExplorerLinkToContract(chainId, deployment.address)}.`);

  const sleepDuration = 10000;

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

/**
 * Gets the address of a soon to be deployed contract.
 * @param {string} deployer The address of the deployer account.
 * @param {number|BN} nonce The current nonce for the deployer account.
 * @return {string} The address of a contract if it is deployed in the next transaction sent by the deployer account.
 */
function getContractAddress(deployer, nonce) {
  const deployAddress = Address.generate(Address.fromString(deployer), new BN(String(nonce)));
  return toChecksumAddress(deployAddress.toString());
}

async function ipfsPublish(fileName, data) {
  const buffer = await Buffer.from(data);

  return new Promise((resolve, reject) => {
    fetch("https://ipfs.kleros.io/add", {
      method: "POST",
      body: JSON.stringify({
        fileName,
        buffer,
      }),
      headers: {
        "content-type": "application/json",
      },
    })
      .then((response) => response.json())
      .then((success) => resolve(success.data))
      .catch((err) => reject(err));
  });
}
