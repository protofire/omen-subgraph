import { BigInt, log, Address, BigDecimal } from '@graphprotocol/graph-ts'

import {
  FixedProductMarketMaker,
  Account,  
  FpmmPoolMembership,
  FpmmParticipation,
  Global,
  TradeType,
  FpmmTrade,
} from "../generated/schema"
import {
  FPMMFundingAdded,
  FPMMFundingRemoved,
  FPMMBuy,
  FPMMSell,
  Transfer,
} from "../generated/templates/FixedProductMarketMaker/FixedProductMarketMaker"
import { secondsPerHour, hoursPerDay, zero, zeroDec } from './utils/constants';
import { joinDayAndVolume } from './utils/day-volume';
import { updateScaledVolumes, setLiquidity } from './utils/fpmm';
import { requireToken } from './utils/token';
import { requireGlobal } from './utils/global';

function requireAccount(accountAddress: string): void {
  let account = Account.load(accountAddress);
  if (account == null) {
    account = new Account(accountAddress);
    account.save();
  }
}

function recordTrade(fpmm: FixedProductMarketMaker, 
    traderAddress: string, investmentAmount: BigInt, 
    feeAmount: BigInt, outcomeIndex: BigInt,
    outcomeTokensBought: BigInt, tradeType: TradeType, 
    creationTimestamp: BigInt): void {
  requireAccount(traderAddress);

  let fpmmTradeId = fpmm.id.concat(traderAddress);
  let fpmmTrade = FpmmTrade.load(fpmmTradeId);
  if (fpmmTrade == null) {
    fpmmTrade = new FpmmTrade(fpmmTradeId);
    fpmmTrade.fpmm = fpmm.id;
    fpmmTrade.title = fpmm.title;
    fpmmTrade.collateralToken = fpmm.collateralToken;
    fpmmTrade.type = tradeType;
    fpmmTrade.creator = traderAddress;
    fpmmTrade.creationTimestamp = creationTimestamp;
    fpmmTrade.investmentAmount = investmentAmount;
    fpmmTrade.feeAmount = feeAmount;
    fpmmTrade.outcomeIndex = outcomeIndex;
    fpmmTrade.outcomeTokensBought = outcomeTokensBought;

    fpmmTrade.save();
  }

}

function recordParticipation(fpmm: FixedProductMarketMaker, participantAddress: string): void {
  requireAccount(participantAddress);

  let fpmmParticipationId = fpmm.id.concat(participantAddress);
  let fpmmParticipation = FpmmParticipation.load(fpmmParticipationId);
  if (fpmmParticipation == null) {
    fpmmParticipation = new FpmmParticipation(fpmmParticipationId);
    fpmmParticipation.fpmm = fpmm.id;
    fpmmParticipation.participant = participantAddress;
    fpmmParticipation.title = fpmm.title;

    fpmmParticipation.creationTimestamp = fpmm.creationTimestamp;
    fpmmParticipation.collateralToken = fpmm.collateralToken;
    fpmmParticipation.fee = fpmm.fee;

    fpmmParticipation.category = fpmm.category;
    fpmmParticipation.language = fpmm.language;
    fpmmParticipation.arbitrator = fpmm.arbitrator;
    fpmmParticipation.openingTimestamp = fpmm.openingTimestamp;
    fpmmParticipation.timeout = fpmm.timeout;

    fpmmParticipation.investmentAmount = 
  
    fpmmParticipation.save();
  }
}

function increaseVolume(
  global: Global,
  fpmm: FixedProductMarketMaker,
  amount: BigInt,
  timestamp: BigInt,
  collateralScale: BigInt,
  collateralScaleDec: BigDecimal,
  collateralUSDPrice: BigDecimal,
): void {
  let currentHour = timestamp.div(secondsPerHour);
  let currentDay = currentHour.div(hoursPerDay);
  let currentHourInDay = currentHour.minus(currentDay.times(hoursPerDay)).toI32();
  if (currentHourInDay < 0 || currentHourInDay >= 24) {
    log.error("current hour in day is {}", [
      BigInt.fromI32(currentHourInDay).toString(),
    ]);
    return;
  }
  if (fpmm.collateralVolumeBeforeLastActiveDayByHour.length !== 24) {
    log.error("length of collateralVolumeBeforeLastActiveDayByHour is {}", [
      BigInt.fromI32(fpmm.collateralVolumeBeforeLastActiveDayByHour.length).toString(),
    ]);
    return;
  }

  let lastActiveHour = fpmm.lastActiveHour;
  let collateralVolumeByHour = fpmm.collateralVolumeBeforeLastActiveDayByHour;
  let usdVolumeByHour = fpmm.usdVolumeBeforeLastActiveDayByHour;
  if (lastActiveHour.notEqual(currentHour)) {
    let lastActiveDay = lastActiveHour.div(hoursPerDay);
    let lastActiveHourInDay = lastActiveHour.minus(lastActiveDay.times(hoursPerDay)).toI32();
    if (lastActiveHourInDay < 0 || lastActiveHourInDay >= 24) {
      log.error("last active hour in day is {}", [
        BigInt.fromI32(lastActiveHourInDay).toString(),
      ]);
      return;
    }

    let deltaHours = currentHour.minus(lastActiveHour).toI32();
    if (deltaHours <= 0) {
      log.error("current hour {} not after last active hour {}", [
        currentHour.toString(),
        lastActiveHour.toString(),
      ]);
      return;
    }

    let lastRecordedCollateralVolume = collateralVolumeByHour[lastActiveHourInDay];
    for (let i = 1; i < 24 && i < deltaHours; i++) {
      let j = (lastActiveHourInDay + i) % 24;
      collateralVolumeByHour[j] = lastRecordedCollateralVolume;
    }
    collateralVolumeByHour[currentHourInDay] = fpmm.collateralVolume;
    fpmm.collateralVolumeBeforeLastActiveDayByHour = collateralVolumeByHour;

    let lastRecordedUsdVolume = usdVolumeByHour[lastActiveHourInDay];
    for (let i = 1; i < 24 && i < deltaHours; i++) {
      let j = (lastActiveHourInDay + i) % 24;
      usdVolumeByHour[j] = lastRecordedUsdVolume;
    }
    usdVolumeByHour[currentHourInDay] = fpmm.usdVolume;
    fpmm.usdVolumeBeforeLastActiveDayByHour = usdVolumeByHour;

    fpmm.lastActiveHour = currentHour;
    fpmm.lastActiveDay = currentDay;
  }

  let collateralVolume = fpmm.collateralVolume.plus(amount);
  fpmm.collateralVolume = collateralVolume

  let usdAdded = amount.divDecimal(collateralScaleDec).times(collateralUSDPrice);

  let usdVolume = fpmm.usdVolume.plus(usdAdded);
  fpmm.usdVolume = usdVolume;

  global.usdVolume = global.usdVolume.plus(usdAdded);
  global.save();

  let runningDailyVolumeByHour = fpmm.runningDailyVolumeByHour;
  for (let i = 0; i < 24; i++) {
    runningDailyVolumeByHour[i] = collateralVolume.minus(collateralVolumeByHour[i]);
  }
  fpmm.runningDailyVolumeByHour = runningDailyVolumeByHour;

  let usdRunningDailyVolumeByHour = fpmm.usdRunningDailyVolumeByHour;
  for (let i = 0; i < 24; i++) {
    usdRunningDailyVolumeByHour[i] = usdVolume.minus(usdVolumeByHour[i]);
  }
  fpmm.usdRunningDailyVolumeByHour = usdRunningDailyVolumeByHour;

  fpmm.runningDailyVolume = runningDailyVolumeByHour[(currentHourInDay + 1) % 24];
  fpmm.usdRunningDailyVolume = usdRunningDailyVolumeByHour[(currentHourInDay + 1) % 24];
  fpmm.lastActiveDayAndRunningDailyVolume = joinDayAndVolume(currentDay, fpmm.runningDailyVolume);

  updateScaledVolumes(fpmm as FixedProductMarketMaker, collateralScale, collateralScaleDec, usdRunningDailyVolumeByHour, currentDay, currentHourInDay);
}

export function handleFundingAdded(event: FPMMFundingAdded): void {
  let fpmmAddress = event.address.toHexString();
  let fpmm = FixedProductMarketMaker.load(fpmmAddress);
  if (fpmm == null) {
    log.error('cannot add funding: FixedProductMarketMaker instance for {} not found', [fpmmAddress]);
    return;
  }

  let oldAmounts = fpmm.outcomeTokenAmounts;
  let amountsAdded = event.params.amountsAdded;
  let newAmounts = new Array<BigInt>(oldAmounts.length);
  for(let i = 0; i < newAmounts.length; i++) {
    newAmounts[i] = oldAmounts[i].plus(amountsAdded[i]);
  }

  let collateral = requireToken(fpmm.collateralToken as Address);
  let collateralScale = collateral.scale;
  let collateralScaleDec = collateralScale.toBigDecimal();
  let ethPerCollateral = collateral.ethPerToken;
  let usdPerEth = requireGlobal().usdPerEth;
  let collateralUSDPrice = ethPerCollateral != null && usdPerEth != null ?
    ethPerCollateral.times(usdPerEth as BigDecimal) :
    zeroDec;

  setLiquidity(fpmm as FixedProductMarketMaker, newAmounts, collateralScaleDec, collateralUSDPrice)

  fpmm.save();
}

export function handleFundingRemoved(event: FPMMFundingRemoved): void {
  let fpmmAddress = event.address.toHexString();
  let fpmm = FixedProductMarketMaker.load(fpmmAddress);
  if (fpmm == null) {
    log.error('cannot remove funding: FixedProductMarketMaker instance for {} not found', [fpmmAddress]);
    return;
  }

  let oldAmounts = fpmm.outcomeTokenAmounts;
  let amountsRemoved = event.params.amountsRemoved;
  let newAmounts = new Array<BigInt>(oldAmounts.length);
  for(let i = 0; i < newAmounts.length; i++) {
    newAmounts[i] = oldAmounts[i].minus(amountsRemoved[i]);
  }

  let collateral = requireToken(fpmm.collateralToken as Address);
  let collateralScale = collateral.scale;
  let collateralScaleDec = collateralScale.toBigDecimal();
  let ethPerCollateral = collateral.ethPerToken;
  let usdPerEth = requireGlobal().usdPerEth;
  let collateralUSDPrice = ethPerCollateral != null && usdPerEth != null ?
    ethPerCollateral.times(usdPerEth as BigDecimal) :
    zeroDec;

  setLiquidity(fpmm as FixedProductMarketMaker, newAmounts, collateralScaleDec, collateralUSDPrice);

  fpmm.save();
}

export function handleBuy(event: FPMMBuy): void {
  let fpmmAddress = event.address.toHexString();
  let fpmm = FixedProductMarketMaker.load(fpmmAddress);
  if (fpmm == null) {
    log.error('cannot buy: FixedProductMarketMaker instance for {} not found', [fpmmAddress]);
    return;
  }

  let oldAmounts = fpmm.outcomeTokenAmounts;
  let investmentAmountMinusFees = event.params.investmentAmount.minus(event.params.feeAmount);
  let outcomeIndex = event.params.outcomeIndex.toI32();
  let newAmounts = new Array<BigInt>(oldAmounts.length);
  for(let i = 0; i < newAmounts.length; i++) {
    if (i == outcomeIndex) {
      newAmounts[i] = oldAmounts[i].plus(investmentAmountMinusFees).minus(event.params.outcomeTokensBought);
    } else {
      newAmounts[i] = oldAmounts[i].plus(investmentAmountMinusFees);
    }
  }

  let global = requireGlobal();
  let collateral = requireToken(fpmm.collateralToken as Address);
  let collateralScale = collateral.scale;
  let collateralScaleDec = collateralScale.toBigDecimal();
  let ethPerCollateral = collateral.ethPerToken;
  let usdPerEth = global.usdPerEth;
  let collateralUSDPrice = ethPerCollateral != null && usdPerEth != null ?
    ethPerCollateral.times(usdPerEth as BigDecimal) :
    zeroDec;

  setLiquidity(fpmm as FixedProductMarketMaker, newAmounts, collateralScaleDec, collateralUSDPrice);
  increaseVolume(
    global,
    fpmm as FixedProductMarketMaker,
    investmentAmountMinusFees,
    event.block.timestamp,
    collateralScale,
    collateralScaleDec,
    collateralUSDPrice,
  );

  fpmm.save();

  recordParticipation(fpmm as FixedProductMarketMaker, 
    event.params.buyer.toHexString());

  recordTrade(fpmm as FixedProductMarketMaker, 
    event.params.buyer.toHexString(), event.params.investmentAmount,
    event.params.feeAmount, event.params.outcomeIndex,
    event.params.outcomeTokensBought, TradeType.Buy,
    event.block.timestamp);
}

export function handleSell(event: FPMMSell): void {
  let fpmmAddress = event.address.toHexString()
  let fpmm = FixedProductMarketMaker.load(fpmmAddress);
  if (fpmm == null) {
    log.error('cannot sell: FixedProductMarketMaker instance for {} not found', [fpmmAddress]);
    return;
  }

  let oldAmounts = fpmm.outcomeTokenAmounts;
  let returnAmountPlusFees = event.params.returnAmount.plus(event.params.feeAmount);
  let outcomeIndex = event.params.outcomeIndex.toI32();
  let newAmounts = new Array<BigInt>(oldAmounts.length);
  for(let i = 0; i < newAmounts.length; i++) {
    if (i == outcomeIndex) {
      newAmounts[i] = oldAmounts[i].minus(returnAmountPlusFees).plus(event.params.outcomeTokensSold);
    } else {
      newAmounts[i] = oldAmounts[i].minus(returnAmountPlusFees);
    }
  }

  let global = requireGlobal();
  let collateral = requireToken(fpmm.collateralToken as Address);
  let collateralScale = collateral.scale;
  let collateralScaleDec = collateralScale.toBigDecimal();
  let ethPerCollateral = collateral.ethPerToken;
  let usdPerEth = global.usdPerEth;
  let collateralUSDPrice = ethPerCollateral != null && usdPerEth != null ?
    ethPerCollateral.times(usdPerEth as BigDecimal) :
    zeroDec;

  setLiquidity(fpmm as FixedProductMarketMaker, newAmounts, collateralScaleDec, collateralUSDPrice);
  increaseVolume(
    global,
    fpmm as FixedProductMarketMaker,
    returnAmountPlusFees,
    event.block.timestamp,
    collateralScale,
    collateralScaleDec,
    collateralUSDPrice,
  );

  fpmm.save();

  recordParticipation(fpmm as FixedProductMarketMaker, 
    event.params.seller.toHexString());

  recordTrade(fpmm as FixedProductMarketMaker, 
    event.params.buyer.toHexString(), event.params.investmentAmount,
    event.params.feeAmount, event.params.outcomeIndex,
    event.params.outcomeTokensBought, TradeType.Sell,
    event.block.timestamp);
}

export function handlePoolShareTransfer(event: Transfer): void {
  let fpmmAddress = event.address.toHexString()
  let fpmm = FixedProductMarketMaker.load(fpmmAddress);

  let fromAddress = event.params.from.toHexString();
  requireAccount(fromAddress);

  let fromMembershipId = fpmmAddress.concat(fromAddress);
  let fromMembership = FpmmPoolMembership.load(fromMembershipId);
  if (fromMembership == null) {
    fromMembership = new FpmmPoolMembership(fromMembershipId);
    fromMembership.pool = fpmmAddress;
    fromMembership.funder = fromAddress;
    fromMembership.amount = event.params.value.neg();
  } else {
    fromMembership.amount = fromMembership.amount.minus(event.params.value);
  }
  fromMembership.save();

  let toAddress = event.params.to.toHexString();
  requireAccount(toAddress);

  let toMembershipId = fpmmAddress.concat(toAddress);
  let toMembership = FpmmPoolMembership.load(toMembershipId);
  if (toMembership == null) {
    toMembership = new FpmmPoolMembership(toMembershipId);
    toMembership.pool = fpmmAddress;
    toMembership.funder = toAddress;
    toMembership.amount = event.params.value;
  } else {
    toMembership.amount = toMembership.amount.plus(event.params.value);
  }
  toMembership.save();

  recordParticipation(fpmm as FixedProductMarketMaker, toAddress, 
    event.params.investmentAmount.toBigDecimal(),
    event.params.feeAmount.toBigDecimal(),
    event.params.outcomeIndex.toI32(),
    event.params.outcomeTokensBought.toBigDecimal());
}
