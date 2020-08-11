import { BigInt, Address, BigDecimal } from '@graphprotocol/graph-ts'
import { FixedProductMarketMaker } from "../generated/schema";
import { ERC20Detailed } from "../generated/templates/ERC20Detailed/ERC20Detailed"
import { zero, one, ten } from './constants';
import { nthRoot } from './nth-root';
import { joinDayAndScaledVolume } from './day-volume-utils';

export function getCollateralScale(collateralTokenAddress: Address): BigInt {
  let collateralToken = ERC20Detailed.bind(collateralTokenAddress);
  let result = collateralToken.try_decimals();

  return result.reverted ?
    one :
    ten.pow(<u8>result.value);
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

  let amountsProduct = one;
  for(let i = 0; i < outcomeTokenAmounts.length; i++) {
    amountsProduct = amountsProduct.times(outcomeTokenAmounts[i]);
  }
  let liquidityParameter = nthRoot(amountsProduct, outcomeTokenAmounts.length);
  fpmm.liquidityParameter = liquidityParameter;
  fpmm.scaledLiquidityParameter = liquidityParameter.divDecimal(collateralScaleDec);

  let weights = new Array<BigInt>(outcomeTokenAmounts.length);
  let sum = zero;
  let allNonzero = true;
  for (let i = 0; i < outcomeTokenAmounts.length; i++) {
    let weight = one;
    for (let j = 0; j < outcomeTokenAmounts.length; j++) {
      if (i !== j) {
        weight = weight.times(outcomeTokenAmounts[j]);
      }
    }
    weights[i] = weight;
    sum = sum.plus(weight);
    allNonzero = allNonzero && outcomeTokenAmounts[i].notEqual(zero);
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
    fpmm.liquidityMeasure = zero;
    fpmm.scaledLiquidityMeasure = zero.toBigDecimal();
  }
}
