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
  runningDailyVolumeByHour: BigInt[],
  currentDay: BigInt,
  currentHourInDay: i32,
): void {
  fpmm.scaledCollateralVolume = fpmm.collateralVolume.divDecimal(collateralScaleDec);
  fpmm.scaledRunningDailyVolume = fpmm.runningDailyVolume.divDecimal(collateralScaleDec);

  fpmm.lastActiveDayAndScaledRunningDailyVolume = joinDayAndScaledVolume(
    currentDay,
    fpmm.runningDailyVolume,
    collateralScale
  );

  if (currentHourInDay === 0) currentDay = currentDay.minus(one);
  fpmm.sort24HourVolume0 = joinDayAndScaledVolume(
    currentDay,
    runningDailyVolumeByHour[1],
    collateralScale,
  );

  if (currentHourInDay === 1) currentDay = currentDay.minus(one);
  fpmm.sort24HourVolume1 = joinDayAndScaledVolume(
    currentDay,
    runningDailyVolumeByHour[2],
    collateralScale,
  );

  if (currentHourInDay === 2) currentDay = currentDay.minus(one);
  fpmm.sort24HourVolume2 = joinDayAndScaledVolume(
    currentDay,
    runningDailyVolumeByHour[3],
    collateralScale,
  );

  if (currentHourInDay === 3) currentDay = currentDay.minus(one);
  fpmm.sort24HourVolume3 = joinDayAndScaledVolume(
    currentDay,
    runningDailyVolumeByHour[4],
    collateralScale,
  );

  if (currentHourInDay === 4) currentDay = currentDay.minus(one);
  fpmm.sort24HourVolume4 = joinDayAndScaledVolume(
    currentDay,
    runningDailyVolumeByHour[5],
    collateralScale,
  );

  if (currentHourInDay === 5) currentDay = currentDay.minus(one);
  fpmm.sort24HourVolume5 = joinDayAndScaledVolume(
    currentDay,
    runningDailyVolumeByHour[6],
    collateralScale,
  );

  if (currentHourInDay === 6) currentDay = currentDay.minus(one);
  fpmm.sort24HourVolume6 = joinDayAndScaledVolume(
    currentDay,
    runningDailyVolumeByHour[7],
    collateralScale,
  );

  if (currentHourInDay === 7) currentDay = currentDay.minus(one);
  fpmm.sort24HourVolume7 = joinDayAndScaledVolume(
    currentDay,
    runningDailyVolumeByHour[8],
    collateralScale,
  );

  if (currentHourInDay === 8) currentDay = currentDay.minus(one);
  fpmm.sort24HourVolume8 = joinDayAndScaledVolume(
    currentDay,
    runningDailyVolumeByHour[9],
    collateralScale,
  );

  if (currentHourInDay === 9) currentDay = currentDay.minus(one);
  fpmm.sort24HourVolume9 = joinDayAndScaledVolume(
    currentDay,
    runningDailyVolumeByHour[10],
    collateralScale,
  );

  if (currentHourInDay === 10) currentDay = currentDay.minus(one);
  fpmm.sort24HourVolume10 = joinDayAndScaledVolume(
    currentDay,
    runningDailyVolumeByHour[11],
    collateralScale,
  );

  if (currentHourInDay === 11) currentDay = currentDay.minus(one);
  fpmm.sort24HourVolume11 = joinDayAndScaledVolume(
    currentDay,
    runningDailyVolumeByHour[12],
    collateralScale,
  );

  if (currentHourInDay === 12) currentDay = currentDay.minus(one);
  fpmm.sort24HourVolume12 = joinDayAndScaledVolume(
    currentDay,
    runningDailyVolumeByHour[13],
    collateralScale,
  );

  if (currentHourInDay === 13) currentDay = currentDay.minus(one);
  fpmm.sort24HourVolume13 = joinDayAndScaledVolume(
    currentDay,
    runningDailyVolumeByHour[14],
    collateralScale,
  );

  if (currentHourInDay === 14) currentDay = currentDay.minus(one);
  fpmm.sort24HourVolume14 = joinDayAndScaledVolume(
    currentDay,
    runningDailyVolumeByHour[15],
    collateralScale,
  );

  if (currentHourInDay === 15) currentDay = currentDay.minus(one);
  fpmm.sort24HourVolume15 = joinDayAndScaledVolume(
    currentDay,
    runningDailyVolumeByHour[16],
    collateralScale,
  );

  if (currentHourInDay === 16) currentDay = currentDay.minus(one);
  fpmm.sort24HourVolume16 = joinDayAndScaledVolume(
    currentDay,
    runningDailyVolumeByHour[17],
    collateralScale,
  );

  if (currentHourInDay === 17) currentDay = currentDay.minus(one);
  fpmm.sort24HourVolume17 = joinDayAndScaledVolume(
    currentDay,
    runningDailyVolumeByHour[18],
    collateralScale,
  );

  if (currentHourInDay === 18) currentDay = currentDay.minus(one);
  fpmm.sort24HourVolume18 = joinDayAndScaledVolume(
    currentDay,
    runningDailyVolumeByHour[19],
    collateralScale,
  );

  if (currentHourInDay === 19) currentDay = currentDay.minus(one);
  fpmm.sort24HourVolume19 = joinDayAndScaledVolume(
    currentDay,
    runningDailyVolumeByHour[20],
    collateralScale,
  );

  if (currentHourInDay === 20) currentDay = currentDay.minus(one);
  fpmm.sort24HourVolume20 = joinDayAndScaledVolume(
    currentDay,
    runningDailyVolumeByHour[21],
    collateralScale,
  );

  if (currentHourInDay === 21) currentDay = currentDay.minus(one);
  fpmm.sort24HourVolume21 = joinDayAndScaledVolume(
    currentDay,
    runningDailyVolumeByHour[22],
    collateralScale,
  );

  if (currentHourInDay === 22) currentDay = currentDay.minus(one);
  fpmm.sort24HourVolume22 = joinDayAndScaledVolume(
    currentDay,
    runningDailyVolumeByHour[23],
    collateralScale,
  );

  if (currentHourInDay === 23) currentDay = currentDay.minus(one);
  fpmm.sort24HourVolume23 = joinDayAndScaledVolume(
    currentDay,
    runningDailyVolumeByHour[0],
    collateralScale,
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
