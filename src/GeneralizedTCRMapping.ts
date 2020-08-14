import { Address, BigInt, log, Bytes } from '@graphprotocol/graph-ts';
import { ItemStatusChange, GeneralizedTCR } from '../generated/GeneralizedTCR/GeneralizedTCR';
import { CuratedMarket } from '../generated/schema';


export function handleItemStatusChange(event: ItemStatusChange): void {
  const tcr = GeneralizedTCR.bind(event.address);
  const itemInfo = tcr.getItemInfo(event.params._itemID);
  const decodedData = itemInfo.value0.toString()

  const addressStartIndex = decodedData.lastIndexOf('0x')
  if (addressStartIndex == -1) {
    log.warning('No address found for itemID {} ', [event.params._itemID.toHexString()])
    return // Invalid submission. No Op
  }
  const fpmmAddress = decodedData.slice(addressStartIndex, addressStartIndex + 42)

  let curatedMarket = CuratedMarket.load(fpmmAddress)
  if (curatedMarket == null) {
    curatedMarket = new CuratedMarket(fpmmAddress);
    curatedMarket.itemID = event.params._itemID.toHexString();
  }

  curatedMarket.status = itemInfo.value1;
  curatedMarket.registered = curatedMarket.status == 1 || curatedMarket.status == 3;
  curatedMarket.save();
}


