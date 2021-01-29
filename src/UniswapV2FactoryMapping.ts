/* eslint-disable prefer-const */
import { UniswapPair } from "../generated/schema";
import { PairCreated } from "../generated/UniswapV2Factory/UniswapV2Factory";
import { UniswapV2Pair } from "../generated/templates";
import { zero } from "./utils/constants";
import { requireToken } from "./utils/token";

export function handleNewPair(event: PairCreated): void {
  let token0 = requireToken(event.params.token0);
  let token1 = requireToken(event.params.token1);

  let pairAddress = event.params.pair;
  let pairAddressHex = pairAddress.toHexString();
  let pair = new UniswapPair(pairAddressHex);
  pair.token0 = token0.id;
  pair.token1 = token1.id;
  pair.reserve0 = zero;
  pair.reserve1 = zero;

  pair.save();

  UniswapV2Pair.create(pairAddress);
}
