import { BigInt, log, Address, BigDecimal } from '@graphprotocol/graph-ts'

import {
  FixedProductMarketMaker,
  Account,
  FpmmPoolMembership,
  FpmmParticipation,
} from "../generated/schema"
import {
  FPMMFundingAdded,
  FPMMFundingRemoved,
  FPMMBuy,
  FPMMSell,
  Transfer,
} from "../generated/templates/FixedProductMarketMaker/FixedProductMarketMaker"
import { secondsPerHour, hoursPerDay } from './constants';
import { joinDayAndVolume } from './day-volume-utils';
import { updateScaledVolumes, getCollateralScale, setLiquidity } from './fpmm-utils';

function requireAccount(accountAddress: string): void {
  let account = Account.load(accountAddress);
  if (account == null) {
    account = new Account(accountAddress);
    account.save();
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

    fpmmParticipation.creationTimestamp = fpmm.creationTimestamp;
    fpmmParticipation.collateralToken = fpmm.collateralToken;
    fpmmParticipation.fee = fpmm.fee;

    fpmmParticipation.category = fpmm.category;
    fpmmParticipation.language = fpmm.language;
    fpmmParticipation.arbitrator = fpmm.arbitrator;
    fpmmParticipation.openingTimestamp = fpmm.openingTimestamp;
    fpmmParticipation.timeout = fpmm.timeout;
  
    fpmmParticipation.save();
  }
}

function increaseVolume(
  fpmm: FixedProductMarketMaker,
  amount: BigInt,
  timestamp: BigInt,
  collateralScale: BigInt,
  collateralScaleDec: BigDecimal,
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
    fpmm.lastActiveHour = currentHour;
    fpmm.lastActiveDay = currentDay;
  }

  fpmm.collateralVolume = fpmm.collateralVolume.plus(amount);
  fpmm.runningDailyVolume = fpmm.collateralVolume.minus(collateralVolumeByHour[(currentHourInDay + 1) % 24]);
  fpmm.lastActiveDayAndRunningDailyVolume = joinDayAndVolume(currentDay, fpmm.runningDailyVolume);

  updateScaledVolumes(fpmm as FixedProductMarketMaker, collateralScale, collateralScaleDec, currentDay);
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

  let collateralScale = getCollateralScale(fpmm.collateralToken as Address);
  let collateralScaleDec = collateralScale.toBigDecimal();

  setLiquidity(fpmm as FixedProductMarketMaker, newAmounts, collateralScaleDec)

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

  let collateralScale = getCollateralScale(fpmm.collateralToken as Address);
  let collateralScaleDec = collateralScale.toBigDecimal();

  setLiquidity(fpmm as FixedProductMarketMaker, newAmounts, collateralScaleDec);

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

  let collateralScale = getCollateralScale(fpmm.collateralToken as Address);
  let collateralScaleDec = collateralScale.toBigDecimal();

  setLiquidity(fpmm as FixedProductMarketMaker, newAmounts, collateralScaleDec);
  increaseVolume(
    fpmm as FixedProductMarketMaker,
    investmentAmountMinusFees,
    event.block.timestamp,
    collateralScale,
    collateralScaleDec,
  );

  fpmm.save();

  recordParticipation(fpmm as FixedProductMarketMaker, event.params.buyer.toHexString());
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

  let collateralScale = getCollateralScale(fpmm.collateralToken as Address);
  let collateralScaleDec = collateralScale.toBigDecimal();

  setLiquidity(fpmm as FixedProductMarketMaker, newAmounts, collateralScaleDec);
  increaseVolume(
    fpmm as FixedProductMarketMaker,
    returnAmountPlusFees,
    event.block.timestamp,
    collateralScale,
    collateralScaleDec,
  );

  fpmm.save();

  recordParticipation(fpmm as FixedProductMarketMaker, event.params.seller.toHexString());
}

export function handlePoolShareTransfer(event: Transfer): void {
  let fpmmAddress = event.address.toHexString()

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
}
