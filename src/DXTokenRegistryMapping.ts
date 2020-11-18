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
  let tokenListId = event.params.listId.toString();
  let tokenList = TokenList.load(tokenListId);
  if(tokenList == null) {
    log.info('cannot find tokenList {}', [tokenListId]);
    return;
  }

  let tokenAddress = event.params.token;
  let token = RegisteredToken.load(tokenAddress.toHexString());
  if(token == null) {
    log.info('cannot find token {} to remove', [tokenAddress.toHexString()]);
    return;
  }

  tokenList.activeTokenCount = tokenList.activeTokenCount.minus(one);
  let tokens = tokenList.tokens;
  tokenList.tokens = tokens.filter((tokenId) => tokenId !== event.params.token.toHexString());
  tokenList.save();

  if(event.params.listId.toI32() == 4) {
    let fpmmAddress = event.params.token.toHex();
    let fpmm = FixedProductMarketMaker.load(fpmmAddress);

    if (fpmm == null) {
      log.warning("could not unregister FPMM {} as curated by dxDAO", [fpmmAddress]);
      return;
    }

    fpmm.curatedByDxDao = false;
    fpmm.curatedByDxDaoOrKleros = fpmm.klerosTCRregistered == true;
    fpmm.save();
  }
}