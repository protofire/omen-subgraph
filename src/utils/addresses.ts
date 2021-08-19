import { dataSource, log } from "@graphprotocol/graph-ts";

export const ADDRESS_ZERO = "0x0000000000000000000000000000000000000000";

export function getStakingRewardsFactoryAddress(): string {
  let network = dataSource.network() as string;
  // not using a switch-case because using strings is not yet supported (only u32)
  if (network == "mainnet") return ADDRESS_ZERO;
  if (network == "rinkeby") return "0xf50d900859da289a34204bC5FcA14c77575BD910";
  if (network == "xdai") return "0x583d56828996060aDF22c4D8d27371FD5b7F637B";
  log.warning("no staking rewards factory address for unsupported network {}", [
    network,
  ]);
  return ADDRESS_ZERO;
}
