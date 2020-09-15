import { log } from '@graphprotocol/graph-ts'
import { AddToken, RemoveToken } from '../generated/DXTokenRegistry/DXTokenRegistry'
import { FixedProductMarketMaker, FpmmParticipation } from '../generated/schema'

export function handleAddToken(event: AddToken): void {
  if(event.params.listId.toI32() == 4) {
    let fpmmAddress = event.params.token.toHex();
    let fpmm = FixedProductMarketMaker.load(fpmmAddress);
    let fpmmParticipation = FpmmParticipation.load(fpmmAddress);

    if (fpmm == null) {
      log.warning("could not register FPMM {} as curated by dxDAO", [fpmmAddress]);
      return;
    }

    fpmm.curatedByDxDao = true;
    fpmm.curatedByDxDaoOrKleros = true;
    fpmm.save();

    fpmmParticipation.curatedByDxDao = true;
    fpmmParticipation.curatedByDxDaoOrKleros = true;
    fpmmParticipation.save();
  }
}

export function handleRemoveToken(event: RemoveToken): void {
  if(event.params.listId.toI32() == 4) {
    let fpmmAddress = event.params.token.toHex();
    let fpmm = FixedProductMarketMaker.load(fpmmAddress);
    let fpmmParticipation = FpmmParticipation.load(fpmmAddress);

    if (fpmm == null) {
      log.warning("could not unregister FPMM {} as curated by dxDAO", [fpmmAddress]);
      return;
    }

    fpmm.curatedByDxDao = false;
    fpmm.curatedByDxDaoOrKleros = fpmm.klerosTCRregistered == true;
    fpmm.save();

    fpmmParticipation.curatedByDxDao = false;
    fpmmParticipation.curatedByDxDaoOrKleros = fpmmParticipation.klerosTCRregistered == true;
    fpmmParticipation.save();
  }
}