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
  log.info('GTCR: address input {} address output {} ', [fpmmAddress, lowerCaseFpmmAddr])

  let fpmm = FixedProductMarketMaker.load(lowerCaseFpmmAddr);
  if (fpmm == null) {
    log.warning("GTCR: Could not load FPMM for {}", [lowerCaseFpmmAddr]);
    return;
  } else {
    log.info("GTCR: Got FPMM for {}", [lowerCaseFpmmAddr])
  }

  fpmm.klerosTCRitemID = event.params._itemID.toHexString();
  fpmm.klerosTCRstatus = itemInfo.value1;
  fpmm.klerosTCRregistered = fpmm.klerosTCRstatus == 1 || fpmm.klerosTCRstatus == 3;
  fpmm.save();

  let a = fpmm.klerosTCRstatus
  log.info("GTCR: Saved fpmm at {} new status {} itemID {}", [lowerCaseFpmmAddr, a.toString(), event.params._itemID.toHexString()])
}


