pragma solidity ^0.5.11;

import { WETH9 } from "canonical-weth/contracts/WETH9.sol";

import { Realitio_v2_1 as Realitio } from "@realitio/realitio-contracts/truffle/contracts/Realitio_v2_1.sol";
import { Arbitrator } from "@realitio/realitio-contracts/truffle/contracts/Arbitrator.sol";

import { ConditionalTokens } from "@gnosis.pm/conditional-tokens-contracts/contracts/ConditionalTokens.sol";

import { RealitioProxy } from "realitio-gnosis-proxy/contracts/RealitioProxy.sol";
import { RealitioScalarAdapter } from "realitio-gnosis-proxy/contracts/RealitioScalarAdapter.sol";

import { FPMMDeterministicFactory } from "@gnosis.pm/conditional-tokens-market-makers/contracts/FPMMDeterministicFactory.sol";
import { FPMMDeterministicFactoryV2 } from "@kadenzipfel/conditional-tokens-market-makers/contracts/FPMMDeterministicFactoryV2.sol";
import { FixedProductMarketMaker } from "@gnosis.pm/conditional-tokens-market-makers/contracts/FixedProductMarketMaker.sol";
import { FixedProductMarketMakerV2 } from "@kadenzipfel/conditional-tokens-market-makers/contracts/FixedProductMarketMakerV2.sol";

import { ERC20Detailed } from "openzeppelin-solidity/contracts/token/ERC20/ERC20Detailed.sol";

import { SimpleCentralizedArbitrator } from "@kleros/erc-792/contracts/examples/SimpleCentralizedArbitrator.sol";
import { GeneralizedTCR } from "@kleros/tcr/contracts/GeneralizedTCR.sol";

import { UniswapV2Factory } from "@uniswap/v2-core/contracts/UniswapV2Factory.sol";
import { UniswapV2Pair } from "@uniswap/v2-core/contracts/UniswapV2Pair.sol";

import { DXswapFactory } from "@levelkdev/dxswap-core/contracts/DXswapFactory.sol";
import { DXswapPair } from "@levelkdev/dxswap-core/contracts/DXswapPair.sol";
