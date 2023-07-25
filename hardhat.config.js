require("@nomiclabs/hardhat-etherscan");
require("@nomiclabs/hardhat-waffle");
require("@nomiclabs/hardhat-ethers");
require("hardhat-deploy");
require("hardhat-gas-reporter");
require("solidity-coverage");
const dotenv = require("dotenv");
const { BN, Address, toChecksumAddress } = require("ethereumjs-util");
dotenv.config();

task("compute-contract-address", "Computes contract address.")
  .addParam("account", "The account's address")
  .addOptionalParam("nonce", "Custom nonce. Default: next nonce.")
  .setAction(async (taskArgs, { ethers, config, network }, hre) => {
    let nonce;
    if (!taskArgs.nonce) {
      process.stdout.write("Fetching next nonce...\r");
      const web3provider = new ethers.providers.JsonRpcProvider(network.config);
      nonce = await web3provider.getTransactionCount(taskArgs.account);
      process.stdout.write(`Nonce: ${nonce}            \n`);
    } else nonce = taskArgs.nonce;
    const deployAddress = Address.generate(Address.fromString(taskArgs.account), new BN(String(nonce)));
    const checksumAddress = toChecksumAddress(deployAddress.toString());

    console.log(`If ${taskArgs.account} would deploy a contract in ${nonce}th transaction, it's address would be ${checksumAddress} .`);
    return checksumAddress;
  });

/**
 * @type import('hardhat/config').HardhatUserConfig
 */
module.exports = {
  solidity: {
    compilers: [
      {
        version: "0.8.4",
      },
      {
        version: "0.7.6",
        settings: {},
      },
    ],
  },
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts",
    deploy: "./deploy",
  },
  networks: {
    main: {
      chainId: 1,
      url: `https://mainnet.infura.io/v3/${process.env?.INFURA_PROJECT_ID}` || "",
      accounts: process.env.PRIVATE_KEY !== undefined ? [process.env.PRIVATE_KEY] : [],
    },
    hardhat: {
      initialBaseFeePerGas: 0, // workaround from https://github.com/sc-forks/solidity-coverage/issues/652#issuecomment-896330136 . Remove when that issue is closed.
    },
    goerli: {
      chainId: 5,
      url: `https://goerli.infura.io/v3/${process.env?.INFURA_PROJECT_ID}` || "",
      accounts: process.env.PRIVATE_KEY !== undefined ? [process.env.PRIVATE_KEY] : [],
    },
    gnosis: {
      chainId: 100,
      url: "https://rpc.gnosischain.com" || "",
      accounts: process.env.PRIVATE_KEY !== undefined ? [process.env.PRIVATE_KEY] : [],
    },
  },
  gasReporter: {
    enabled: process.env.REPORT_GAS !== undefined,
    currency: "USD",
  },
  etherscan: {
    apiKey: process.env.ETHERSCAN,
  },
};
