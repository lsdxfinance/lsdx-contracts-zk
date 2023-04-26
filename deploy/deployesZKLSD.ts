import { Wallet, utils } from "zksync-web3";
import * as ethers from "ethers";
import dotenv from "dotenv";
import { HardhatRuntimeEnvironment } from "hardhat/types";
import { Deployer } from "@matterlabs/hardhat-zksync-deploy";

export default async function(hre: HardhatRuntimeEnvironment) {
  console.log(`Deploying esZKLSD contract to zkSync`);

  dotenv.config();
  const privateKey: string = process.env.PRIVATE_KEY || "";

  const wallet = new Wallet(privateKey);
  const deployer = new Deployer(hre, wallet);

  const zkESLSDContract = await deployer.loadArtifact("esZKLSD");

  // Estimate contract deployment fee
  const esLSDAddress = '0xfcE4C0Bf973638Cab5b1E783BDcD6f58e5a0A465';
  const deploymentFee = await deployer.estimateDeployFee(zkESLSDContract, [esLSDAddress]);

  // Deploy this contract. The returned object will be of a `Contract` type, similarly to ones in `ethers`.
  const parsedFee = ethers.utils.formatEther(deploymentFee.toString());
  console.log(`The deployment is estimated to cost ${parsedFee} ETH`);

  const esZKLSD = await deployer.deploy(zkESLSDContract, [esLSDAddress]);


  console.log(`${zkESLSDContract.contractName} was deployed to ${esZKLSD.address}`);
  console.log(`Constructor argument encoded: ${esZKLSD.interface.encodeDeploy([esLSDAddress])}`);
}
