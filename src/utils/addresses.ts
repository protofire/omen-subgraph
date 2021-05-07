import { dataSource, log } from "@graphprotocol/graph-ts";

export const ADDRESS_ZERO = "0x0000000000000000000000000000000000000000";

export function getStakingRewardsFactoryAddress(): string {
  let network = dataSource.network() as string;
  // not using a switch-case because using strings is not yet supported (only u32)
  if (network == "mainnet") return ADDRESS_ZERO;
  if (network == "rinkeby") return "0x784f23B6c26157125B29216340562ad60E969C55";
  if (network == "xdai") return ADDRESS_ZERO;
  log.warning("no staking rewards factory address for unsupported network {}", [
    network,
  ]);
  return ADDRESS_ZERO;
}
