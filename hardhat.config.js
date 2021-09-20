require("@nomiclabs/hardhat-etherscan");
require("@nomiclabs/hardhat-waffle");
require("@nomiclabs/hardhat-ethers");
require("hardhat-deploy");
require("hardhat-gas-reporter");
require("solidity-coverage");
const { BN, Address, toChecksumAddress } = require("ethereumjs-util");

task("compute-contract-address", "Computes contract address.")
  .addParam("account", "The account's address")
  .addOptionalParam("nonce", "Custom nonce. Default: next nonce.")
  .setAction(async (taskArgs, { ethers, config, network }, hre) => {
    let nonce;
    if (!taskArgs.nonce) {
      console.log("Fetching next nonce...");
      const web3provider = new ethers.providers.JsonRpcProvider(network.config);
      nonce = await web3provider.getTransactionCount(taskArgs.account);
      console.log(`Nonce: ${nonce}`);
    } else nonce = taskArgs.nonce;
    const deployAddress = Address.generate(Address.fromString(taskArgs.account), new BN(String(nonce)));
    console.log(`${toChecksumAddress(deployAddress.toString())}`);
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
      url: `https://infura.io/v3/${process.env?.INFURA_PROJECT_ID}` || "",
      accounts: process.env.PRIVATE_KEY !== undefined ? [process.env.PRIVATE_KEY] : [],
    },
    hardhat: {
      initialBaseFeePerGas: 0, // workaround from https://github.com/sc-forks/solidity-coverage/issues/652#issuecomment-896330136 . Remove when that issue is closed.
    },
    ropsten: {
      chainId: 3,
      url: `https://ropsten.infura.io/v3/${process.env?.INFURA_PROJECT_ID}` || "",
      accounts: process.env.PRIVATE_KEY !== undefined ? [process.env.PRIVATE_KEY] : [],
    },
    rinkeby: {
      chainId: 4,
      url: `https://rinkeby.infura.io/v3/${process.env?.INFURA_PROJECT_ID}` || "",
      accounts: process.env.PRIVATE_KEY !== undefined ? [process.env.PRIVATE_KEY] : [],
    },
    kovan: {
      chainId: 42,
      url: `https://kovan.infura.io/v3/${process.env.INFURA_PROJECT_ID}` || "",
      accounts: process.env.PRIVATE_KEY !== undefined ? [process.env.PRIVATE_KEY] : [],
    },
    sokol: {
      chainId: 77,
      url: "https://sokol.poa.network" || "",
      accounts: process.env.PRIVATE_KEY !== undefined ? [process.env.PRIVATE_KEY] : [],
    },
    xdai: {
      chainId: 100,
      url: "https://rpc.xdaichain.com" || "",
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
