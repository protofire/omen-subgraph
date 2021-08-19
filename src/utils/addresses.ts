import { dataSource, log } from "@graphprotocol/graph-ts";

export const ADDRESS_ZERO = "0x0000000000000000000000000000000000000000";

export function getStakingRewardsFactoryAddress(): string {
  let network = dataSource.network() as string;
  // not using a switch-case because using strings is not yet supported (only u32)
  if (network == "mainnet") return ADDRESS_ZERO;
  if (network == "rinkeby") return "0x264f2e08859736D96B546d1EF206C9D4dDDef05a";
  if (network == "xdai") return "0x583d56828996060aDF22c4D8d27371FD5b7F637B";
  log.warning("no staking rewards factory address for unsupported network {}", [
    network,
  ]);
  return ADDRESS_ZERO;
}

export function getFPMMDeterministicFactoryV2Address(): string {
  let network = dataSource.network() as string;
  // not using a switch-case because using strings is not yet supported (only u32)
  if (network == "mainnet") return ADDRESS_ZERO;
  if (network == "rinkeby") return "0x3A8eDb904ee335Fb828EC71e080d8BfA2CDb8167";
  if (network == "xdai") return ADDRESS_ZERO;
  log.warning("no fpmm v2 factory address for unsupported network {}", [
    network,
  ]);
  return ADDRESS_ZERO;
}
