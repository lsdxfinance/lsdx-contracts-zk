import * as _ from 'lodash';
import dotenv from "dotenv";
import * as ethers from "ethers";
import * as zksync from "zksync-web3";
import { StakingPoolFactory__factory, EsZKLSD__factory } from '../typechain';

const { BigNumber } = ethers;

dotenv.config();

const privateKey: string = process.env.PRIVATE_KEY || "";

// zkSync Era Testnet
const provider = new zksync.Provider("https://testnet.era.zksync.dev");
const esZKLSDTokenAddress = '0x409f53FBa3bB7a9D41CD1C23B33e64075C4972b4';
const stakingPoolFactoryContractAddress = '0x1E2F289612CFf42d9d8C368949F60A536cC569C5';

// zkSync Era Mainnet
// const provider = new zksync.Provider("");
// const esZKLSDTokenAddress = '';
// const stakingPoolFactoryContractAddress = '';


const pools = [
  {
    stakingTokenName: 'zkLSD',
    stakingTokenAddress: '0xfcE4C0Bf973638Cab5b1E783BDcD6f58e5a0A465',
    // stakingTokenAddress: '',
    rewards: expandTo18Decimals(7_000)
  },
];

function expandTo18Decimals(n: number) {
  return BigNumber.from(n).mul(BigNumber.from(10).pow(18));
}

async function main() {
  const esZKLSDToken = EsZKLSD__factory.connect(esZKLSDTokenAddress, provider);
  const stakingPoolFactory = StakingPoolFactory__factory.connect(stakingPoolFactoryContractAddress, provider);

  const admin = new zksync.Wallet(privateKey, provider);

  let totalRewards = BigNumber.from(0);
  for (let i = 0; i < _.size(pools); i++) {
    totalRewards = totalRewards.add(pools[i].rewards);
  }
  console.log(`Adding total rewards ${ethers.utils.formatUnits(totalRewards, 18)} to ${_.size(pools)} pools`);

  // Approve staking pool factory to spend tokens
  const approveTrans = await esZKLSDToken.connect(admin).approve(stakingPoolFactory.address, totalRewards);
  await approveTrans.wait();
  console.log(`Approved staking pool factory to spend tokens`);

  // Make sure the staking pool factory is in esZKLSDToken's whitelist list
  const isWhitelisted = await esZKLSDToken.isAddressWhitelisted(stakingPoolFactory.address);
  if (!isWhitelisted) {
    // Add staking pool factory to the whitelist
    const whitelistTrans = await esZKLSDToken.connect(admin).setWhitelistAddress(stakingPoolFactory.address, true);
    await whitelistTrans.wait();
    console.log(`Added staking pool factory to the whitelist`);
  }

  for (let i = 0; i < _.size(pools); i++) {
    const pool = pools[i];

    // Make sure the staking pool is in esZKLSDToken's whitelist list
    const stakingPoolAddress = await stakingPoolFactory.getStakingPoolAddress(pool.stakingTokenAddress);
    const isWhitelisted = await esZKLSDToken.isAddressWhitelisted(stakingPoolAddress);
    if (!isWhitelisted) {
      // Add staking pool to the whitelist
      const whitelistTrans = await esZKLSDToken.connect(admin).setWhitelistAddress(stakingPoolAddress, true);
      await whitelistTrans.wait();
      console.log(`Added ${pool.stakingTokenName} staking pool to the whitelist`);
    }

    const trans = await stakingPoolFactory.connect(admin).addRewards(pool.stakingTokenAddress, pool.rewards);
    await trans.wait();
    console.log(`Added ${ethers.utils.formatUnits(pool.rewards, 18)} rewards to ${pool.stakingTokenName} staking pool`);
  }
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
