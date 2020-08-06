import { log } from '@graphprotocol/graph-ts'
import { AddToken, RemoveToken } from '../generated/DXTokenRegistry/DXTokenRegistry'
import { FixedProductMarketMaker } from '../generated/schema'

export function handleAddToken(event: AddToken): void {
  if(event.params.listId.toI32() == 4) {
    let fpmmAddress = event.params.token.toHex();
    let fpmm = FixedProductMarketMaker.load(fpmmAddress);

    if (fpmm == null) {
      log.warning("could not register FPMM {} as curated by dxDAO", [fpmmAddress]);
      return;
    }

    fpmm.curatedByDxDao = true;
    fpmm.save();
  }
}

export function handleRemoveToken(event: RemoveToken): void {
  if(event.params.listId.toI32() == 4) {
    let fpmmAddress = event.params.token.toHex();
    let fpmm = FixedProductMarketMaker.load(fpmmAddress);

    if (fpmm == null) {
      log.warning("could not unregister FPMM {} as curated by dxDAO", [fpmmAddress]);
      return;
    }

    fpmm.curatedByDxDao = false;
    fpmm.save();
  }
}