import { log, Address, BigInt } from "@graphprotocol/graph-ts";
import { UniswapPair, Token } from "../generated/schema";
import { UniswapV2Factory } from "../generated/UniswapV2Factory/UniswapV2Factory";
import { Sync } from "../generated/templates/UniswapV2Pair/UniswapV2Pair";
import { usdStablecoins, isUSDStablecoin, isWETH } from "./utils/token";
import { requireGlobal } from "./utils/global";
import { zero, zeroDec } from "./utils/constants";

let uniswapV2Factory = UniswapV2Factory.bind(
  Address.fromString("{{UniswapV2Factory.address}}")
);

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

  if (isWETH(pair.token0)) {
    if (isUSDStablecoin(pair.token1)) refreshUsdPerEth();
    updateEthPerToken(pair.token1, pair.reserve1, pair.reserve0);
  } else if (isWETH(pair.token1)) {
    if (isUSDStablecoin(pair.token0)) refreshUsdPerEth();
    updateEthPerToken(pair.token0, pair.reserve0, pair.reserve1);
  }
}

let wethAddress = Address.fromString("{{WETH9.address}}");
const addressZero = "0x0000000000000000000000000000000000000000";

function refreshUsdPerEth(): void {
  let global = requireGlobal();

  let weth = Token.load("{{WETH9.addressLowerCase}}");
  if (weth == null) return;

  let wethReserves = zero;
  let usdReserves = zeroDec;

  for (let i = 0; i < usdStablecoins.length; i++) {
    let stablecoinId = usdStablecoins[i];
    let stablecoin = Token.load(stablecoinId);
    if (stablecoin == null) continue;

    let usdWethPairAddress = uniswapV2Factory
      .getPair(Address.fromString(stablecoinId), wethAddress)
      .toHexString();
    if (usdWethPairAddress == addressZero) continue;

    let usdWethPair = UniswapPair.load(usdWethPairAddress);
    if (usdWethPair == null) continue;

    if (isWETH(usdWethPair.token0)) {
      wethReserves = wethReserves.plus(usdWethPair.reserve0);
      usdReserves = usdReserves.plus(
        usdWethPair.reserve1.divDecimal(stablecoin.scale.toBigDecimal())
      );
    } else {
      wethReserves = wethReserves.plus(usdWethPair.reserve1);
      usdReserves = usdReserves.plus(
        usdWethPair.reserve0.divDecimal(stablecoin.scale.toBigDecimal())
      );
    }
  }

  if (wethReserves.gt(zero) && usdReserves.gt(zeroDec)) {
    global.usdPerEth = usdReserves
      .times(weth.scale.toBigDecimal())
      .div(wethReserves.toBigDecimal());
  } else {
    global.usdPerEth = null;
  }
  global.save();
}

function updateEthPerToken(
  tokenId: string,
  tokenReserve: BigInt,
  wethReserve: BigInt
): void {
  let weth = Token.load("{{WETH9.addressLowerCase}}");
  if (weth == null) {
    log.error("could not find weth", []);
    return;
  }

  let token = Token.load(tokenId);
  if (token == null) {
    log.error("could not find token {}", [tokenId]);
    return;
  }

  if (tokenReserve.gt(zero) && wethReserve.gt(zero)) {
    token.ethPerToken = wethReserve
      .times(token.scale)
      .divDecimal(tokenReserve.times(weth.scale).toBigDecimal());
  } else {
    token.ethPerToken = null;
  }
  token.save();
}
