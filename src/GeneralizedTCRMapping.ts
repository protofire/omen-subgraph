import { log } from '@graphprotocol/graph-ts';
import { ItemStatusChange, GeneralizedTCR } from '../generated/GeneralizedTCR/GeneralizedTCR';
import { FixedProductMarketMaker } from '../generated/schema';

function hexStringToLowerCase(input: string): string {
  // Code looks weird? Unfortunately the current version
  // of assemblyscript does not support things like regex
  // and replace/replaceAll, so we work around it.
  let output = ''
  for (let i = 0; i < input.length; i++) {
    if (input[i] == 'A')
      output += 'a'
    else if (input[i] == 'B')
      output += 'b'
    else if (input[i] == 'C')
      output += 'c'
    else if (input[i] == 'D')
      output += 'd'
    else if (input[i] == 'E')
      output += 'e'
    else if (input[i] == 'F')
      output += 'f'
    else output += input[i]
  }

  return output
}

export function handleItemStatusChange(event: ItemStatusChange): void {
  const tcr = GeneralizedTCR.bind(event.address);
  const itemInfo = tcr.getItemInfo(event.params._itemID);
  const decodedData = itemInfo.value0.toString()

  const addressStartIndex = decodedData.lastIndexOf('0x')
  if (addressStartIndex == -1) {
    log.warning('GTCR: No address found for itemID {} ', [event.params._itemID.toHexString()])
    return // Invalid submission. No Op
  }
  const fpmmAddress = decodedData.slice(addressStartIndex, addressStartIndex + 42)

  // Workaround missing String.toLowerCase function in assemblyscript.
  const lowerCaseFpmmAddr = hexStringToLowerCase(fpmmAddress)

  let fpmm = FixedProductMarketMaker.load(lowerCaseFpmmAddr);
  if (fpmm == null) {
    log.warning("GTCR: Could not load FPMM for {}", [lowerCaseFpmmAddr]);
    return;
  }

  // Items on a TCR can be in 1 of 4 states:
  // - (0) Absent: The item is not registered on the TCR and there are no pending requests.
  // - (1) Registered: The item is registered and there are no pending requests.
  // - (2) Registration Requested: The item is not registered on the TCR, but there is a pending
  //       registration request.
  // - (3) Removal Requested: The item is registered on the TCR, but there is a pending removal
  //       request.
  //
  // Registration and Removal requests can be challenged. Once the request resolves (either by
  // passing the challenge period or via dispute resolution), the item state is updated to 0 or 1.

  const REGISTERED = 1;
  const REMOVAL_REQUESTED = 3;

  fpmm.klerosTCRitemID = event.params._itemID.toHexString();
  fpmm.klerosTCRstatus = itemInfo.value1;
  fpmm.klerosTCRregistered = fpmm.klerosTCRstatus == REGISTERED || fpmm.klerosTCRstatus == REMOVAL_REQUESTED;
  fpmm.curatedByDxDaoOrKleros = fpmm.klerosTCRregistered == true || fpmm.curatedByDxDao == true;
  fpmm.save();
}


