import { ItemStatusChange, GeneralizedTCR } from '../generated/GeneralizedTCR/GeneralizedTCR';

export function handleItemStatusChange(event: ItemStatusChange): void {
  const tcr = GeneralizedTCR.bind(event.address);
  const itemInfo = tcr.getItemInfo(event.params._itemID)

  // TODO: Port RLP decoder for strings to AssemblyScript
  // TODO: Decode item data, extract FPMM's address with .(0x[0-9a-f]).
  // TODO: Get the conditionId, save the Market.
}


