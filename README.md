# LSDx Contracts for zkSync

## Compile

```sh
yarn hardhat compile
```
## Deploy

### Prepare `.env` 

With same keys to `.env-example`

### Deploy and verify

```sh
$ yarn hardhat deploy-zksync --script deployzkLSD
$ yarn hardhat verify <zkLSD Address> <Treasury Address>

$ yarn hardhat deploy-zksync --script deployesZKLSD
$ yarn hardhat verify <esZKLSD Address> <zKLSD Address>

$ yarn hardhat deploy-zksync --script deployStakingPoolFactory
$ yarn hardhat verify <StakingPoolFactory Address> --constructor-args ./deploy/stakingPoolFactoryArguments.js
```

## Admin Ops

```sh
$ hh run scripts/deployStakingPools.ts

$ hh run scripts/addRewards.ts
```