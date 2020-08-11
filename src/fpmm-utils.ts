import { BigInt, Address, BigDecimal } from '@graphprotocol/graph-ts'
import { FixedProductMarketMaker } from "../generated/schema";
import { ERC20Detailed } from "../generated/templates/ERC20Detailed/ERC20Detailed"
import { joinDayAndScaledVolume } from './day-volume-utils';
import { nthRoot } from './nth-root';

export function getCollateralScale(collateralTokenAddress: Address): BigInt {
  let collateralToken = ERC20Detailed.bind(collateralTokenAddress);
  let result = collateralToken.try_decimals();

  return result.reverted ?
    BigInt.fromI32(1) :
    BigInt.fromI32(10).pow(<u8>result.value);
}

export function updateScaledVolumes(
  fpmm: FixedProductMarketMaker,
  collateralScale: BigInt,
  collateralScaleDec: BigDecimal,
  currentDay: BigInt,
): void {
  fpmm.scaledCollateralVolume = fpmm.collateralVolume.divDecimal(collateralScaleDec);
  fpmm.scaledRunningDailyVolume = fpmm.runningDailyVolume.divDecimal(collateralScaleDec);
  
  fpmm.lastActiveDayAndScaledRunningDailyVolume = joinDayAndScaledVolume(
    currentDay,
    fpmm.runningDailyVolume,
    collateralScale
  );
}

export function setLiquidity(
  fpmm: FixedProductMarketMaker,
  outcomeTokenAmounts: BigInt[],
  collateralScaleDec: BigDecimal,
): void {
  fpmm.outcomeTokenAmounts = outcomeTokenAmounts;

  let amountsProduct = BigInt.fromI32(1);
  for(let i = 0; i < outcomeTokenAmounts.length; i++) {
    amountsProduct = amountsProduct.times(outcomeTokenAmounts[i]);
  }
  let liquidityParameter = nthRoot(amountsProduct, outcomeTokenAmounts.length);
  fpmm.liquidityParameter = liquidityParameter;
  fpmm.scaledLiquidityParameter = liquidityParameter.divDecimal(collateralScaleDec);

  let weights = new Array<BigInt>(outcomeTokenAmounts.length);
  let sum = BigInt.fromI32(0);
  let allNonzero = true;
  for (let i = 0; i < outcomeTokenAmounts.length; i++) {
    let weight = BigInt.fromI32(1);
    for (let j = 0; j < outcomeTokenAmounts.length; j++) {
      if (i !== j) {
        weight = weight.times(outcomeTokenAmounts[j]);
      }
    }
    weights[i] = weight;
    sum = sum.plus(weight);
    allNonzero = allNonzero && outcomeTokenAmounts[i].notEqual(BigInt.fromI32(0));
  }

  if (allNonzero) {
    let sumDec = sum.toBigDecimal();
    let marginalPrices = new Array<BigDecimal>(outcomeTokenAmounts.length);
    for (let i = 0; i < outcomeTokenAmounts.length; i++) {
      marginalPrices[i] = weights[i].divDecimal(sumDec);
    }
    fpmm.outcomeTokenMarginalPrices = marginalPrices;

    let liquidityMeasure = BigInt.fromI32(outcomeTokenAmounts.length)
      .times(outcomeTokenAmounts[0])
      .times(weights[0])
      .div(sum);
    fpmm.liquidityMeasure = liquidityMeasure;
    fpmm.scaledLiquidityMeasure = liquidityMeasure.divDecimal(collateralScaleDec);
  } else {
    fpmm.outcomeTokenMarginalPrices = null;
    fpmm.liquidityMeasure = BigInt.fromI32(0);
    fpmm.scaledLiquidityMeasure = BigInt.fromI32(0).toBigDecimal();
  }
}
