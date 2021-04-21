import { DataSourceContext, log } from "@graphprotocol/graph-ts";
import {
  StakingRewardsFactory,
  LiquidityMiningCampaign,
  LMDeposit,
  LMWithdrawal,
  LMClaim,
  LMRecovery,
} from "../generated/schema";
import { Distribution as DistributionTemplate } from "../generated/templates";

import { DistributionCreated } from "../generated/StakingRewardsFactory/StakingRewardsFactory";

export function handleDistributionCreation(event: DistributionCreated): void {
  log.info("handleDistributionCreation", []);
  let context = new DataSourceContext();
  context.setString("owner", event.params.owner.toHexString());
  context.setString("address", event.params.deployedAt.toHexString());
  DistributionTemplate.createWithContext(event.params.deployedAt, context);
  log.info("Distribution creation handled", []);
}
