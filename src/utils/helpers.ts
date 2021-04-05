import { BigInt, BigDecimal } from "@graphprotocol/graph-ts";

export let ZERO_BI = BigInt.fromI32(0);
export let ONE_BI = BigInt.fromI32(1);
export let ZERO_BD = BigDecimal.fromString("0");
export let BI_18 = BigInt.fromI32(18);

export function convertTokenToDecimal(
  tokenAmount: BigInt,
  scale: BigInt
): BigDecimal {
  if (scale == ZERO_BI) {
    return tokenAmount.toBigDecimal();
  }
  return tokenAmount.toBigDecimal().div(scale.toBigDecimal());
}
