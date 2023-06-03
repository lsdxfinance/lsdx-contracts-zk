import { Wallet, Provider } from "zksync-web3";
import * as ethers from "ethers";
import dotenv from "dotenv";
import { HardhatRuntimeEnvironment } from "hardhat/types";
import { Deployer } from "@matterlabs/hardhat-zksync-deploy";

const TOKEN_ADDRESS = '';
const AMOUNT = '0.01';

export default async function(hre: HardhatRuntimeEnvironment) {
  console.log(`Deposit to zkSync bridge`);

  dotenv.config();
  const privateKey: string = process.env.PRIVATE_KEY || "";
  const infuraKey: string = process.env.INFURA_KEY || "";

  const provider = new Provider(`https://mainnet.infura.io/v3/${infuraKey}`);
  const wallet = new Wallet(privateKey, provider);
  const deployer = new Deployer(hre, wallet);

  // Deposit ERC20 tokens to L2
  const depositHandle = await deployer.zkWallet.deposit({
    to: deployer.zkWallet.address,
    token: TOKEN_ADDRESS,
    amount: ethers.utils.parseEther(AMOUNT), // assumes ERC20 has 18 decimals
    // performs the ERC20 approve action
    approveERC20: true,
  });

  console.log(`Deposit transaction sent ${depositHandle.hash}`);
  console.log(`Waiting for deposit to be processed in L2...`);
  // Wait until the deposit is processed on zkSync
  await depositHandle.wait();
  console.log(`ERC20 tokens available in L2`);
}