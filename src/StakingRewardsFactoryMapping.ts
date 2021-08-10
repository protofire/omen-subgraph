import { DataSourceContext, log } from "@graphprotocol/graph-ts";
import { Distribution as DistributionTemplate } from "../generated/templates";

import { DistributionCreated } from "../generated/StakingRewardsFactory/StakingRewardsFactory";

export function handleDistributionCreation(event: DistributionCreated): void {
  if (
    event.address.toHexString() == "0x0000000000000000000000000000000000000000"
  ) {
    return;
  }

  let context = new DataSourceContext();
  context.setString("owner", event.params.owner.toHexString());
  context.setString("address", event.params.deployedAt.toHexString());
  DistributionTemplate.createWithContext(event.params.deployedAt, context);
}
