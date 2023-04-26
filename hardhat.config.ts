import dotenv from "dotenv";
import "@matterlabs/hardhat-zksync-deploy";
import "@matterlabs/hardhat-zksync-solc";
import "@matterlabs/hardhat-zksync-verify";
import "@typechain/hardhat";

dotenv.config();

const infuraKey: string = process.env.INFURA_KEY || "";

// Set Proxy
// const proxyUrl = 'http://127.0.0.1:59797';
// const { ProxyAgent, setGlobalDispatcher } = require("undici");
// const proxyAgent = new ProxyAgent(proxyUrl);
// setGlobalDispatcher(proxyAgent);

module.exports = {
  zksolc: {
    version: "1.3.9",
    compilerSource: "binary",
    settings: {},
  },
  defaultNetwork: "zkTestnet",

  networks: {
    goerli: {
      url: `https://goerli.infura.io/v3/${infuraKey}` // The Ethereum Web3 RPC URL (optional).
    },
    zkTestnet: {
      url: "https://testnet.era.zksync.dev",
      ethNetwork: `goerli`, // RPC URL of the network (e.g. `https://goerli.infura.io/v3/<API_KEY>`)
      zksync: true,
      // Verification endpoint for Goerli
      verifyURL: 'https://zksync2-testnet-explorer.zksync.dev/contract_verification'
    },
  },
  solidity: {
    version: "0.8.8",
  },
  typechain: {
    outDir: "typechain",
    target: "ethers-v5",
  },
};