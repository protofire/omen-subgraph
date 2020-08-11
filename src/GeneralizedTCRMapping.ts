import { Address, BigInt, log, Bytes } from '@graphprotocol/graph-ts';
import { ItemStatusChange, GeneralizedTCR } from '../generated/GeneralizedTCR/GeneralizedTCR';
import { CuratedMarket } from '../generated/schema';


export function handleItemStatusChange(event: ItemStatusChange): void {
  if (!event.params._resolved) return // No op, we only care about registered or absent states.

  const tcr = GeneralizedTCR.bind(event.address);
  const itemInfo = tcr.getItemInfo(event.params._itemID);
  const decodedData = itemInfo.value0.toString()

  const addressStartIndex = decodedData.lastIndexOf('0x')
  if (addressStartIndex == -1) return // Invalid submission. No Op
  const fpmmAddress = decodedData.slice(decodedData.lastIndexOf('0x'))

  let curatedMarket = CuratedMarket.load(event.params._itemID.toHexString())
  if (curatedMarket == null) {
    curatedMarket = new CuratedMarket(event.params._itemID.toHexString());
    curatedMarket.fpmmAddress = fpmmAddress;
  }

  curatedMarket.status = itemInfo.value1;
  curatedMarket.save();
}


