import {
  log,
  DataSourceContext,
  dataSource,
  Bytes,
  Address,
  BigDecimal,
} from "@graphprotocol/graph-ts";
import {
  StakingRewardsFactory,
  FixedProductMarketMaker,
  Token,
  LiquidityMiningCampaign,
  LMDeposit,
  LMWithdrawal,
  LMClaim,
  LMRecovery,
} from "../generated/schema";
import {
  Distribution as DistributionTemplate,
  ERC20Detailed,
} from "../generated/templates";
import { DistributionCreated } from "../generated/StakingRewardsFactory/StakingRewardsFactory";
import {
  Canceled,
  Claimed,
  Initialized,
  Recovered,
  Staked,
  Withdrawn,
} from "../generated/templates/Distribution/StakingRewardsDistribution";
import networks from "../networks.json";
import { one, ten } from "./utils/constants";
import { BI_18, convertTokenToDecimal, ZERO_BD } from "./utils/helpers";

export function handleDistributionInitialization(event: Initialized): void {
  // load factory (create if first distribution)
  let network = dataSource.network() as string;
  let stakingRewardsFactoryAddress =
    networks.StakingRewardsFactory[network].address;
  let factory = StakingRewardsFactory.load(stakingRewardsFactoryAddress);
  if (factory === null) {
    factory = new StakingRewardsFactory(stakingRewardsFactoryAddress);
    factory.initializedCampaignsCount = 0;
  }
  factory.initializedCampaignsCount = factory.initializedCampaignsCount + 1;
  factory.save();

  if (
    event.params.rewardsTokenAddresses.length !==
    event.params.rewardsAmounts.length
  ) {
    // bail if the passed reward-related arrays have a different length
    log.error("inconsistent reward tokens and amounts", []);
    return;
  }
  let fpmm = FixedProductMarketMaker.load(
    event.params.stakableTokenAddress.toHexString()
  );
  if (fpmm === null) {
    // bail if the passed stakable token is not a registered pair (LP token)
    log.error("could not get pair for address", [
      event.params.stakableTokenAddress.toString(),
    ]);
    return;
  }
  let context = dataSource.context();
  let hexDistributionAddress = context.getString("address");
  // distribution needs to be loaded since it's possible to cancel and then reinitialize
  // an already-existing instance
  let distribution = LiquidityMiningCampaign.load(hexDistributionAddress);
  if (distribution === null) {
    distribution = new LiquidityMiningCampaign(hexDistributionAddress);
  }
  distribution.owner = Bytes.fromHexString(context.getString("owner")) as Bytes;
  distribution.startsAt = event.params.startingTimestamp;
  distribution.endsAt = event.params.endingTimestamp;
  let duration = distribution.endsAt.minus(distribution.startsAt);
  distribution.duration = duration;
  distribution.locked = event.params.locked;
  distribution.fpmm = fpmm.id;
  let rewardTokenAddresses = event.params.rewardsTokenAddresses;
  let eventRewardAmounts = event.params.rewardsAmounts;
  let rewardAmounts: BigDecimal[] = [];
  let rewardTokenIds: string[] = [];
  for (let index = 0; index < rewardTokenAddresses.length; index++) {
    let address: Address = rewardTokenAddresses[index];
    let hexTokenAddress = address.toHexString();
    let rewardToken = Token.load(hexTokenAddress);
    if (rewardToken === null) {
      rewardToken = new Token(hexTokenAddress);
      let erc20 = ERC20Detailed.bind(address);
      let decimalsResult = erc20.try_decimals();

      rewardToken.scale =
        decimalsResult.reverted || decimalsResult.value > 18
          ? one
          : ten.pow(<u8>decimalsResult.value);

      rewardToken.save();
    }
    rewardAmounts.push(
      convertTokenToDecimal(eventRewardAmounts[index], rewardToken.decimals)
    );
    rewardTokenIds.push(rewardToken.id);
  }
  distribution.stakedAmount = ZERO_BD;
  distribution.rewardAmounts = rewardAmounts;
  distribution.rewardTokens = rewardTokenIds;
  distribution.initialized = true;
  distribution.save();
}

export function handleDistributionCancelation(event: Canceled): void {
  // load factory (create if first distribution)
  let network = dataSource.network() as string;
  let stakingRewardsFactoryAddress =
    networks.StakingRewardsFactory[network].address;
  let factory = StakingRewardsFactory.load(stakingRewardsFactoryAddress);
  if (factory === null) {
    // bail if factory is null
    log.error("factory must be initialized when canceling a distribution", []);
    return;
  }
  factory.initializedCampaignsCount = factory.initializedCampaignsCount - 1;
  factory.save();

  let canceledDistribution = LiquidityMiningCampaign.load(
    event.address.toHexString()
  );
  canceledDistribution.initialized = false;
  canceledDistribution.save();
}

export function handleDeposit(event: Staked): void {
  let campaign = LiquidityMiningCampaign.load(event.address.toHexString());
  let stakedAmount = convertTokenToDecimal(event.params.amount, BI_18); // lp tokens have hardcoded 18 decimals
  campaign.stakedAmount = campaign.stakedAmount.plus(stakedAmount);
  campaign.save();

  // populating the stake deposit entity
  let deposit = new LMDeposit(event.transaction.hash.toHexString());
  deposit.liquidityMiningCampaign = campaign.id;
  deposit.user = event.params.staker;
  deposit.timestamp = event.block.timestamp;
  deposit.amount = stakedAmount;
  deposit.save();
}

export function handleWithdrawal(event: Withdrawn): void {
  let campaign = LiquidityMiningCampaign.load(event.address.toHexString());
  let withdrawnAmount = convertTokenToDecimal(event.params.amount, BI_18);
  campaign.stakedAmount = campaign.stakedAmount.minus(withdrawnAmount);
  campaign.save();

  // populating the withdrawal entity
  let withdrawal = new LMWithdrawal(event.transaction.hash.toHexString());
  withdrawal.liquidityMiningCampaign = campaign.id;
  withdrawal.user = event.params.withdrawer;
  withdrawal.timestamp = event.block.timestamp;
  withdrawal.amount = withdrawnAmount;
  withdrawal.save();
}

export function handleClaim(event: Claimed): void {
  let campaign = LiquidityMiningCampaign.load(event.address.toHexString());

  // populating the claim entity
  let claim = new LMClaim(event.transaction.hash.toHexString());
  claim.amounts = [];
  claim.liquidityMiningCampaign = campaign.id;
  claim.user = event.params.claimer;
  claim.timestamp = event.block.timestamp;

  let distributionRewardTokens = campaign.rewardTokens;
  let claimedAmounts = event.params.amounts;
  for (let i = 0; i < distributionRewardTokens.length; i++) {
    let token = Token.load(distributionRewardTokens[i]) as Token;
    claim.amounts.push(
      convertTokenToDecimal(claimedAmounts[i], token.decimals)
    );
  }
  claim.save();
}

export function handleRecovery(event: Recovered): void {
  let campaign = LiquidityMiningCampaign.load(event.address.toHexString());

  // populating the recovery entity
  let recovery = new LMRecovery(event.transaction.hash.toHexString());
  recovery.amounts = [];
  recovery.liquidityMiningCampaign = campaign.id;
  recovery.timestamp = event.block.timestamp;

  let distributionRewardTokens = campaign.rewardTokens;
  let recoveredAmounts = event.params.amounts;
  for (let i = 0; i < distributionRewardTokens.length; i++) {
    let token = Token.load(distributionRewardTokens[i]) as Token;
    recovery.amounts.push(
      convertTokenToDecimal(recoveredAmounts[i], token.decimals)
    );
  }
  recovery.save();
}
