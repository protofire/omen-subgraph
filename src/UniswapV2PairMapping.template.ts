import { log, BigInt, BigDecimal } from '@graphprotocol/graph-ts'
import {
  UniswapPair, Token,
} from '../generated/schema'
import { Sync } from '../generated/templates/UniswapV2Pair/UniswapV2Pair'
import { isUSDStablecoin } from './utils/token'
import { zero } from './utils/constants';

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

  refreshTokenPriceUSD(pair.token0);
  refreshTokenPriceUSD(pair.token1);
}

function refreshTokenPriceUSD(tokenId: string): void {
  if (isUSDStablecoin(tokenId)) return;

  let token = Token.load(tokenId);
  if (token == null) {
    log.error("could not load token {} to refresh", [tokenId]);
    return;
  }

  let pairIds = token.pairs;
  let tokenAmount = zero;
  let counterAmountUSD = zero.toBigDecimal();
  for (let i = 0; i < pairIds.length; i++) {
    let pairId = pairIds[i];
    let pair = UniswapPair.load(pairId);
    if (pair == null) {
      log.error("could not find Uniswap pair {}", [pairId]);
      continue;
    }

    if (pair.reserve0.equals(zero) || pair.reserve1.equals(zero)) {
      log.info("skipping pair {} with one of reserves missing", [pairId]);
      continue;
    }

    let tokenReserve: BigInt;
    let counterTokenId: string;
    let counterTokenReserve: BigInt;
    if (tokenId == pair.token0) {
      tokenReserve = pair.reserve0;
      counterTokenId = pair.token1;
      counterTokenReserve = pair.reserve1;
    } else if (tokenId == pair.token1) {
      tokenReserve = pair.reserve1;
      counterTokenId = pair.token0;
      counterTokenReserve = pair.reserve0;
    } else {
      log.error("pair {} does not contain expected token {}", [pairId, tokenId]);
      continue;
    }

    let counterToken = Token.load(counterTokenId);
    if (counterToken == null) {
      log.error("could not load counter token {}", [counterTokenId]);
      continue;
    }

    if (counterToken.priceUSD != null) {
      tokenAmount = tokenAmount.plus(tokenReserve);
      counterAmountUSD = counterAmountUSD.plus(
        counterTokenReserve
          .divDecimal(counterToken.scale.toBigDecimal())
          .times(counterToken.priceUSD as BigDecimal)
      );
    }
  }

  if (tokenAmount.gt(zero) && counterAmountUSD.gt(zero.toBigDecimal())) {
    token.priceUSD = counterAmountUSD
      .times(token.scale.toBigDecimal())
      .div(tokenAmount.toBigDecimal());
  } else {
    token.priceUSD = null;
  }
  token.save();
}