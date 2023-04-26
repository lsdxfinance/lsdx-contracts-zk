import { Wallet, utils } from "zksync-web3";
import * as ethers from "ethers";
import dotenv from "dotenv";
import { HardhatRuntimeEnvironment } from "hardhat/types";
import { Deployer } from "@matterlabs/hardhat-zksync-deploy";

export default async function(hre: HardhatRuntimeEnvironment) {
  console.log(`Deploying StakingPoolFactory contract to zkSync`);

  dotenv.config();
  const privateKey: string = process.env.PRIVATE_KEY || "";

  const wallet = new Wallet(privateKey);
  const deployer = new Deployer(hre, wallet);

  const stakingPoolFactoryContract = await deployer.loadArtifact("StakingPoolFactory");

  // Estimate contract deployment fee
  const esZKLSDAddress = '0x409f53FBa3bB7a9D41CD1C23B33e64075C4972b4';
  // const wethAddress = '0x5aea5775959fbc2557cc8789bc1bf90a239d9a91'; // Era Mainnet
  const wethAddress = '0x20b28b1e4665fff290650586ad76e977eab90c5d';  // By syncswap
  const deploymentFee = await deployer.estimateDeployFee(stakingPoolFactoryContract, [esZKLSDAddress, wethAddress]);

  // Deploy this contract. The returned object will be of a `Contract` type, similarly to ones in `ethers`.
  const parsedFee = ethers.utils.formatEther(deploymentFee.toString());
  console.log(`The deployment is estimated to cost ${parsedFee} ETH`);

  const stakingPoolFactory = await deployer.deploy(stakingPoolFactoryContract, [esZKLSDAddress, wethAddress]);

  console.log(`${stakingPoolFactoryContract.contractName} was deployed to ${stakingPoolFactory.address}`);
  console.log(`Constructor argument encoded: ${stakingPoolFactory.interface.encodeDeploy([esZKLSDAddress, wethAddress])}`);
}