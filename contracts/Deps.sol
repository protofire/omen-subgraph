pragma solidity ^0.5.11;

import { WETH9 } from "canonical-weth/contracts/WETH9.sol";

import { Realitio } from "@realitio/realitio-contracts/truffle/contracts/Realitio.sol";
import { Arbitrator } from "@realitio/realitio-contracts/truffle/contracts/Arbitrator.sol";

import { ConditionalTokens } from "@gnosis.pm/conditional-tokens-contracts/contracts/ConditionalTokens.sol";

import { RealitioProxy } from "realitio-gnosis-proxy/contracts/RealitioProxy.sol";
import { RealitioScalarAdapter } from "realitio-gnosis-proxy/contracts/RealitioScalarAdapter.sol";

import { FPMMDeterministicFactory } from "@gnosis.pm/conditional-tokens-market-makers/contracts/FPMMDeterministicFactory.sol";
import { FPMMDeterministicFactory as FPMMDeterministicFactoryV2 } from "@kadenzipfel/conditional-tokens-market-makers/contracts/FPMMDeterministicFactory.sol";
import { FixedProductMarketMaker } from "@gnosis.pm/conditional-tokens-market-makers/contracts/FixedProductMarketMaker.sol";

import { ERC20Detailed } from "openzeppelin-solidity/contracts/token/ERC20/ERC20Detailed.sol";

import { SimpleCentralizedArbitrator } from "@kleros/erc-792/contracts/examples/SimpleCentralizedArbitrator.sol";
import { GeneralizedTCR } from "@kleros/tcr/contracts/GeneralizedTCR.sol";

import { UniswapV2Factory } from "@uniswap/v2-core/contracts/UniswapV2Factory.sol";
import { UniswapV2Pair } from "@uniswap/v2-core/contracts/UniswapV2Pair.sol";
