import { BigInt, Address, BigDecimal } from '@graphprotocol/graph-ts'
import { FixedProductMarketMaker } from "../../generated/schema";
import { zero, one, ten, zeroDec } from './constants';
import { nthRoot } from './nth-root';
import { joinDayAndScaledVolume, joinDayAndUsdVolume } from './day-volume';

export function updateScaledVolumes(
  fpmm: FixedProductMarketMaker,
  collateralScale: BigInt,
  collateralScaleDec: BigDecimal,
  usdRunningDailyVolumeByHour: BigDecimal[],
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
  fpmm.sort24HourVolume0 = joinDayAndUsdVolume(
    currentDay,
    usdRunningDailyVolumeByHour[1],
  );

  if (currentHourInDay === 1) currentDay = currentDay.minus(one);
  fpmm.sort24HourVolume1 = joinDayAndUsdVolume(
    currentDay,
    usdRunningDailyVolumeByHour[2],
  );

  if (currentHourInDay === 2) currentDay = currentDay.minus(one);
  fpmm.sort24HourVolume2 = joinDayAndUsdVolume(
    currentDay,
    usdRunningDailyVolumeByHour[3],
  );

  if (currentHourInDay === 3) currentDay = currentDay.minus(one);
  fpmm.sort24HourVolume3 = joinDayAndUsdVolume(
    currentDay,
    usdRunningDailyVolumeByHour[4],
  );

  if (currentHourInDay === 4) currentDay = currentDay.minus(one);
  fpmm.sort24HourVolume4 = joinDayAndUsdVolume(
    currentDay,
    usdRunningDailyVolumeByHour[5],
  );

  if (currentHourInDay === 5) currentDay = currentDay.minus(one);
  fpmm.sort24HourVolume5 = joinDayAndUsdVolume(
    currentDay,
    usdRunningDailyVolumeByHour[6],
  );

  if (currentHourInDay === 6) currentDay = currentDay.minus(one);
  fpmm.sort24HourVolume6 = joinDayAndUsdVolume(
    currentDay,
    usdRunningDailyVolumeByHour[7],
  );

  if (currentHourInDay === 7) currentDay = currentDay.minus(one);
  fpmm.sort24HourVolume7 = joinDayAndUsdVolume(
    currentDay,
    usdRunningDailyVolumeByHour[8],
  );

  if (currentHourInDay === 8) currentDay = currentDay.minus(one);
  fpmm.sort24HourVolume8 = joinDayAndUsdVolume(
    currentDay,
    usdRunningDailyVolumeByHour[9],
  );

  if (currentHourInDay === 9) currentDay = currentDay.minus(one);
  fpmm.sort24HourVolume9 = joinDayAndUsdVolume(
    currentDay,
    usdRunningDailyVolumeByHour[10],
  );

  if (currentHourInDay === 10) currentDay = currentDay.minus(one);
  fpmm.sort24HourVolume10 = joinDayAndUsdVolume(
    currentDay,
    usdRunningDailyVolumeByHour[11],
  );

  if (currentHourInDay === 11) currentDay = currentDay.minus(one);
  fpmm.sort24HourVolume11 = joinDayAndUsdVolume(
    currentDay,
    usdRunningDailyVolumeByHour[12],
  );

  if (currentHourInDay === 12) currentDay = currentDay.minus(one);
  fpmm.sort24HourVolume12 = joinDayAndUsdVolume(
    currentDay,
    usdRunningDailyVolumeByHour[13],
  );

  if (currentHourInDay === 13) currentDay = currentDay.minus(one);
  fpmm.sort24HourVolume13 = joinDayAndUsdVolume(
    currentDay,
    usdRunningDailyVolumeByHour[14],
  );

  if (currentHourInDay === 14) currentDay = currentDay.minus(one);
  fpmm.sort24HourVolume14 = joinDayAndUsdVolume(
    currentDay,
    usdRunningDailyVolumeByHour[15],
  );

  if (currentHourInDay === 15) currentDay = currentDay.minus(one);
  fpmm.sort24HourVolume15 = joinDayAndUsdVolume(
    currentDay,
    usdRunningDailyVolumeByHour[16],
  );

  if (currentHourInDay === 16) currentDay = currentDay.minus(one);
  fpmm.sort24HourVolume16 = joinDayAndUsdVolume(
    currentDay,
    usdRunningDailyVolumeByHour[17],
  );

  if (currentHourInDay === 17) currentDay = currentDay.minus(one);
  fpmm.sort24HourVolume17 = joinDayAndUsdVolume(
    currentDay,
    usdRunningDailyVolumeByHour[18],
  );

  if (currentHourInDay === 18) currentDay = currentDay.minus(one);
  fpmm.sort24HourVolume18 = joinDayAndUsdVolume(
    currentDay,
    usdRunningDailyVolumeByHour[19],
  );

  if (currentHourInDay === 19) currentDay = currentDay.minus(one);
  fpmm.sort24HourVolume19 = joinDayAndUsdVolume(
    currentDay,
    usdRunningDailyVolumeByHour[20],
  );

  if (currentHourInDay === 20) currentDay = currentDay.minus(one);
  fpmm.sort24HourVolume20 = joinDayAndUsdVolume(
    currentDay,
    usdRunningDailyVolumeByHour[21],
  );

  if (currentHourInDay === 21) currentDay = currentDay.minus(one);
  fpmm.sort24HourVolume21 = joinDayAndUsdVolume(
    currentDay,
    usdRunningDailyVolumeByHour[22],
  );

  if (currentHourInDay === 22) currentDay = currentDay.minus(one);
  fpmm.sort24HourVolume22 = joinDayAndUsdVolume(
    currentDay,
    usdRunningDailyVolumeByHour[23],
  );

  if (currentHourInDay === 23) currentDay = currentDay.minus(one);
  fpmm.sort24HourVolume23 = joinDayAndUsdVolume(
    currentDay,
    usdRunningDailyVolumeByHour[0],
  );
}

export function setLiquidity(
  fpmm: FixedProductMarketMaker,
  outcomeTokenAmounts: BigInt[],
  collateralScaleDec: BigDecimal,
  collateralUSDPrice: BigDecimal,
): void {
  fpmm.outcomeTokenAmounts = outcomeTokenAmounts;

  let amountsProduct = one;
  for(let i = 0; i < outcomeTokenAmounts.length; i++) {
    amountsProduct = amountsProduct.times(outcomeTokenAmounts[i]);
  }
  let liquidityParameter = nthRoot(amountsProduct, outcomeTokenAmounts.length);
  fpmm.liquidityParameter = liquidityParameter;
  let scaledLiquidityParameter = liquidityParameter.divDecimal(collateralScaleDec);
  fpmm.scaledLiquidityParameter = scaledLiquidityParameter;
  fpmm.usdLiquidityParameter = scaledLiquidityParameter.times(collateralUSDPrice);

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
    let scaledLiquidityMeasure = liquidityMeasure.divDecimal(collateralScaleDec);
    fpmm.scaledLiquidityMeasure = scaledLiquidityMeasure;
    fpmm.usdLiquidityMeasure = scaledLiquidityMeasure.times(collateralUSDPrice);
  } else {
    fpmm.outcomeTokenMarginalPrices = null;
    fpmm.liquidityMeasure = zero;
    fpmm.scaledLiquidityMeasure = zeroDec;
    fpmm.usdLiquidityMeasure = zeroDec;
  }
}
