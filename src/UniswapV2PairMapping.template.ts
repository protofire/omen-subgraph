import { log } from '@graphprotocol/graph-ts'
import {
  UniswapPair,
} from '../generated/schema'
import { Sync } from '../generated/templates/UniswapV2Pair/UniswapV2Pair'

export function handleSync(event: Sync): void {
  let pairAddressHex = event.address.toHex();
  let pair = UniswapPair.load(pairAddressHex);
  if (pair == null) {
    log.error("could not find Uniswap pair {}", [pairAddressHex]);
    return;
  }

  pair.reserve0 = event.params.reserve0;
  pair.reserve1 = event.params.reserve1;
  pair.save();
}
