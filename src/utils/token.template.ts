import { Address } from "@graphprotocol/graph-ts";
import { Token } from "../../generated/schema";
import { ERC20Detailed } from "../../generated/templates/ERC20Detailed/ERC20Detailed";
import { one, ten, oneDec } from "./constants";

export function isWETH(addressHex: string): boolean {
  return addressHex == '{{WETH9.addressLowerCase}}';
}

export const usdStablecoins: string[] = [
  '{{DAI.addressLowerCase}}',
  '{{USDC.addressLowerCase}}',
  '{{USDT.addressLowerCase}}',
];

export function isUSDStablecoin(addressHex: string): boolean {
  return usdStablecoins.includes(addressHex);
}

export function requireToken(address: Address): Token {
  let addressHex = address.toHexString();
  let token = Token.load(addressHex);
  if (token == null) {
    token = new Token(addressHex);

    let erc20 = ERC20Detailed.bind(address);
    let decimalsResult = erc20.try_decimals();
    token.scale = decimalsResult.reverted ?
      one :
      ten.pow(<u8>decimalsResult.value);

    if (isWETH(addressHex))
      token.ethPerToken = oneDec;

    token.save();
  }
  return token as Token;
}
