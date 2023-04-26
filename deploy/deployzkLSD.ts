import { Wallet, utils } from "zksync-web3";
import * as ethers from "ethers";
import dotenv from "dotenv";
import { HardhatRuntimeEnvironment } from "hardhat/types";
import { Deployer } from "@matterlabs/hardhat-zksync-deploy";

export default async function(hre: HardhatRuntimeEnvironment) {
  console.log(`Deploying zkLSD contract to zkSync`);

  dotenv.config();
  const privateKey: string = process.env.PRIVATE_KEY || "";

  const wallet = new Wallet(privateKey);
  const deployer = new Deployer(hre, wallet);

  const zkLSDContract = await deployer.loadArtifact("zkLSD");

  // Estimate contract deployment fee
  const treasuryAddress = deployer.zkWallet.address;
  const deploymentFee = await deployer.estimateDeployFee(zkLSDContract, [treasuryAddress]);

  // Deploy this contract. The returned object will be of a `Contract` type, similarly to ones in `ethers`.
  const parsedFee = ethers.utils.formatEther(deploymentFee.toString());
  console.log(`The deployment is estimated to cost ${parsedFee} ETH`);

  const zkLSD = await deployer.deploy(zkLSDContract, [treasuryAddress]);

  //obtain the Constructor Arguments
  // console.log("constructor args:" + greeterContract.interface.encodeDeploy([greeting]));

  console.log(`${zkLSDContract.contractName} was deployed to ${zkLSD.address}`);
  console.log(`Constructor argument encoded: ${zkLSD.interface.encodeDeploy([treasuryAddress])}`);
}
