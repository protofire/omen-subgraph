import { dataSource, log } from "@graphprotocol/graph-ts";

export const ADDRESS_ZERO = "0x0000000000000000000000000000000000000000";

export function getUniswapV2FactoryAddress(): string {
  let network = dataSource.network() as string;
  // not using a switch-case because using strings is not yet supported (only u32)
  if (network == "mainnet") return "0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f";
  if (network == "rinkeby") return "0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f";
  log.warning("no uniswap v2 factory address for unsupported network {}", [
    network,
  ]);
  return ADDRESS_ZERO;
}

export function getSwaprFactoryAddress(): string {
  let network = dataSource.network() as string;
  // not using a switch-case because using strings is not yet supported (only u32)
  if (network == "mainnet") return "0xd34971BaB6E5E356fd250715F5dE0492BB070452";
  if (network == "rinkeby") return "0x02f45e773436C6D96Cc73600fe94a660ec67734C";
  if (network == "xdai") return "0x5D48C95AdfFD4B40c1AAADc4e08fc44117E02179";
  if (network == "sokol") return "0x30FB5b5a25D211B91B1d7FFb07d1a059452452aE";
  log.warning("no uniswap v2 factory address for unsupported network {}", [
    network,
  ]);
  return ADDRESS_ZERO;
}

export function getWethAddress(): string {
  let network = dataSource.network() as string;
  // not using a switch-case because using strings is not yet supported (only u32)
  if (network == "mainnet") return "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2";
  if (network == "rinkeby") return "0xc778417E063141139Fce010982780140Aa0cD5Ab";
  if (network == "xdai") return "0x6A023CCd1ff6F2045C3309768eAd9E68F978f6e1";
  log.warning("no uniswap v2 factory address for unsupported network {}", [
    network,
  ]);
  return ADDRESS_ZERO;
}
