import { log } from '@graphprotocol/graph-ts';
import { ItemStatusChange, GeneralizedTCR } from '../generated/GeneralizedTCR/GeneralizedTCR';
import { FixedProductMarketMaker, MarketKleros } from '../generated/schema';

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

// Items on a TCR can be in 1 of 4 states:
// - (0) Absent: The item is not registered on the TCR and there are no pending requests.
// - (1) Registered: The item is registered and there are no pending requests.
// - (2) Registration Requested: The item is not registered on the TCR, but there is a pending
//       registration request.
// - (3) Clearing Requested: The item is registered on the TCR, but there is a pending removal
//       request. These are sometimes also called removal requests.
//
// Registration and removal requests can be challenged. Once the request resolves (either by
// passing the challenge period or via dispute resolution), the item state is updated to 0 or 1.

let ABSENT = "Absent";
let REGISTERED = "Registered";
let REGISTRATION_REQUESTED = "RegistrationRequested";
let CLEARING_REQUESTED = "ClearingRequested";

function getStatus(status: number): string {
  if (status == 0) return ABSENT;
  if (status == 1) return REGISTERED;
  if (status == 2) return REGISTRATION_REQUESTED;
  if (status == 3) return CLEARING_REQUESTED;
  return "Error";
}

export function handleItemStatusChange(event: ItemStatusChange): void {
  log.info('GTCR: handleItemStatusChange for {} started', [event.params._itemID.toHexString()]);
  let tcr = GeneralizedTCR.bind(event.address);
  let itemInfo = tcr.getItemInfo(event.params._itemID);
  let decodedData = itemInfo.value0.toString();

  let addressStartIndex = decodedData.lastIndexOf('0x');
  if (addressStartIndex == -1) {
    log.warning('GTCR: No address found for itemID {}.', [event.params._itemID.toHexString()]);
    return // Invalid submission. No Op
  }
  let fpmmAddress = decodedData.slice(addressStartIndex, addressStartIndex + 42);

  // Workaround missing String.toLowerCase function in assemblyscript.
  let lowerCaseFpmmAddr = hexStringToLowerCase(fpmmAddress);

  let fpmm = FixedProductMarketMaker.load(lowerCaseFpmmAddr);
  if (fpmm == null) {
    log.warning("GTCR: Could not load FPMM for {}.", [lowerCaseFpmmAddr]);
    return;
  }  

  let submissionsCount = fpmm.submissionIDs.length;
  let submissionIndex = -1;  
  log.info('GTCR: Searching for submission. {} submissions for this market', [submissionsCount.toString()]);
  for (let i = 0; i < fpmm.submissionIDs.length; i++) {
    log.info('GTCR: {} of {}.', [(i + 1).toString(), submissionsCount.toString()]);
    let submissionIDs = fpmm.submissionIDs;
    let itemID = submissionIDs[i];
    let submission = MarketKleros.load(itemID);
    if (submission != null) {
      // log.info('GTCR: loaded submission', []);
      if (submission.id == event.params._itemID.toHexString()) {
        // log.info('GTCR: found submission', []);
        submissionIndex = i;
      }
    }   
  }

  if (submissionIndex == -1) {
    let submission = new MarketKleros(event.params._itemID.toHexString()); 
    submission.save();
    
    let submissionIDs = fpmm.submissionIDs;
    submissionIDs.push(submission.id);

    fpmm.submissionIDs = submissionIDs;
    log.info('GTCR: Submission not found. Created one. ID: {}, {}', [submission.id, event.params._itemID.toHexString()]);
  }
  
  fpmm.save();  
}


