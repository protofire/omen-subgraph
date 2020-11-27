import { log, BigInt, Address } from '@graphprotocol/graph-ts'
import { AddList, AddToken, RemoveToken } from '../generated/DXTokenRegistry/DXTokenRegistry'
import { ERC20Detailed } from "../generated/templates/ERC20Detailed/ERC20Detailed";
import { FixedProductMarketMaker, TokenList, RegisteredToken } from '../generated/schema'
import { zero, one } from './utils/constants';

function getOrCreateToken(address: Address): RegisteredToken {
  let token = RegisteredToken.load(address.toHexString());
  if (token != null) {
    return token as RegisteredToken;
  }

  token = new RegisteredToken(address.toHexString());
  let contract = ERC20Detailed.bind(address);

  token.address = address;
  let nameResult = contract.try_name();
  let symbolResult = contract.try_symbol();
  let decimalsResult = contract.try_decimals();
  token.name = nameResult.reverted ? 'token' : nameResult.value;
  token.symbol = symbolResult.reverted ? 'tkn' : symbolResult.value;
  token.decimals = decimalsResult.reverted ? 0 : decimalsResult.value;
  token.save()

  return token as RegisteredToken;
}

export function handleAddList(event: AddList): void {
  let id = event.params.listId.toString();
  let tokenList = TokenList.load(id);
  if(tokenList == null) {
    tokenList = new TokenList(id);
    tokenList.listId = event.params.listId;
    tokenList.listName = event.params.listName;
    tokenList.tokens = [];
    tokenList.activeTokenCount = zero;
    tokenList.save();
  }
}

export function handleAddToken(event: AddToken): void {
  let tokenListId = event.params.listId.toString();
  let tokenList = TokenList.load(tokenListId);
  if(tokenList == null) {
    log.info('cannot find tokenList {}', [tokenListId]);
    return;
  }

  let token = getOrCreateToken(event.params.token);
  tokenList.activeTokenCount = tokenList.activeTokenCount.plus(one);
  let tokens = tokenList.tokens;
  tokens.push(token.id);
  tokenList.tokens = tokens;
  tokenList.save();

  if(event.params.listId.toI32() == 4) {
    let fpmmAddress = event.params.token.toHex();
    let fpmm = FixedProductMarketMaker.load(fpmmAddress);

    if (fpmm == null) {
      log.warning("could not register FPMM {} as curated by dxDAO", [fpmmAddress]);
      return;
    }

    fpmm.curatedByDxDao = true;
    fpmm.curatedByDxDaoOrKleros = true;
    fpmm.save();
  }
}

export function handleRemoveToken(event: RemoveToken): void {
  log.info('handleRemoveToken event starting!', []);
  let tokenListId = event.params.listId.toString();
  log.info('handleRemoveToken event tokenListId {}', [tokenListId]);
  let tokenList = TokenList.load(tokenListId);
  log.info('handleRemoveToken event tokenList loaded, listName is {}', [tokenList.listName]);
  if(tokenList == null) {
    log.info('cannot find tokenList {}', [tokenListId]);
    return;
  }

  let tokenAddress = event.params.token;
  let tokenAddressAsString = tokenAddress.toHexString();
  log.info('handleRemoveToken event event.params.token address {}', [tokenAddressAsString]);
  let token = RegisteredToken.load(tokenAddress.toHexString());
  if(token == null) {
    log.info('cannot find token {} to remove', [tokenAddress.toHexString()]);
    return;
  }

  tokenList.activeTokenCount = tokenList.activeTokenCount.minus(one);
  log.info('handleRemoveToken event tokenList activeTokenCound {}', [tokenList.activeTokenCount.toString()]);
  let tokens = tokenList.tokens as Array<string>;
  let l1 = tokens.length;
  log.info('handleRemoveToken event tokenList.tokens {}', [l1.toString()]);
  let newTokens = new Array<string>(tokens.length - 1);
  for (let i = 0; i < tokens.length; i++) {
    log.info('tokenList.tokens[{}] value is {}', [i.toString(), tokens[i]]);
    if (tokens[i] !== tokenAddressAsString) {
      log.info('Adding {} to newTokens variable', [tokens[i]]);
      newTokens.push(tokens[i]);
    }
  }
  tokenList.tokens = newTokens;
  let l2 = tokenList.tokens.length;
  log.info('handleRemoveToken event filtered tokenList.tokens {} by tokenId is event.params.token {}', [l2.toString(), tokenAddressAsString]);
  tokenList.save();
  log.info('handleRemoveToken event saving tokenList', []);

  if(event.params.listId.toI32() == 4) {
    log.info('handleRemoveToken event listID is 4', []);
    let fpmmAddress = event.params.token.toHex();
    let fpmm = FixedProductMarketMaker.load(fpmmAddress);
    log.info('handleRemoveToken event load fpmm.id {}', [fpmm.id]);

    if (fpmm == null) {
      log.warning("could not unregister FPMM {} as curated by dxDAO", [fpmmAddress]);
      return;
    }

    fpmm.curatedByDxDao = false;
    fpmm.curatedByDxDaoOrKleros = fpmm.klerosTCRregistered == true;
    log.info('handleRemoveToken event curatedByDxDaoOrKleros is {}', [fpmm.curatedByDxDaoOrKleros ? 'true' : 'false']);
    fpmm.save();
    log.info('handleRemoveToken event saved fpmm', []);
  }
}