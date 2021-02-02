import { BigInt } from "@graphprotocol/graph-ts";

export let zero = BigInt.fromI32(0);
export let one = BigInt.fromI32(1);
export let ten = BigInt.fromI32(10);
export let secondsPerHour = BigInt.fromI32(3600);
export let hoursPerDay = BigInt.fromI32(24);

export let zeroDec = zero.toBigDecimal();
export let oneDec = one.toBigDecimal();
