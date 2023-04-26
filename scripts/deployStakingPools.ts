import * as _ from 'lodash';
import dotenv from "dotenv";
import * as zksync from "zksync-web3";
import { StakingPoolFactory__factory } from '../typechain';

const dayjs = require('dayjs');

dotenv.config();

const privateKey: string = process.env.PRIVATE_KEY || "";

// zkSync Era Testnet
const provider = new zksync.Provider("https://testnet.era.zksync.dev");
const stakingPoolFactoryContractAddress = '0x1E2F289612CFf42d9d8C368949F60A536cC569C5';

// zkSync Era Mainnet
// const provider = new zksync.Provider("");
// const stakingPoolFactoryContractAddress = '';

const startTime = dayjs('2023-04-26T07:00:00.000Z'); // UTC time

const pools = [
  {
    stakingTokenName: 'zkLSD',
    stakingTokenAddress: '0xfcE4C0Bf973638Cab5b1E783BDcD6f58e5a0A465',
    // stakingTokenAddress: '',
    startTime,
    roundDurationInDays: 7
  },
];

async function main() {
  const stakingPoolFactory = StakingPoolFactory__factory.connect(stakingPoolFactoryContractAddress, provider);

  const deployer = new zksync.Wallet(privateKey, provider);

  for (let i = 0; i < _.size(pools); i++) {
    const pool = pools[i];
    const trans = await stakingPoolFactory.connect(deployer).deployPool(pool.stakingTokenAddress, pool.startTime.unix(), pool.roundDurationInDays);
    await trans.wait();
    console.log(`Deployed staking pool for ${pool.stakingTokenName}`);
    console.log(`\t\tPool Address: ${await stakingPoolFactory.getStakingPoolAddress(pool.stakingTokenAddress)}`);
    console.log(`\t\tStart timestamp: ${pool.startTime.unix()}`);
    console.log(`\t\tRound duration (days): ${pool.roundDurationInDays}`);
  }
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
