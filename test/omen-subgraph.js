const Web3 = require("web3");
const TruffleContract = require("@truffle/contract");
const { default: axios } = require("axios");
const delay = require("delay");
const fs = require("fs-extra");
const path = require("path");
const should = require("should");
const { gtcrEncode, ItemTypes } = require("@kleros/gtcr-encoder");
const { expect } = require("chai");
const { promisify } = require("util");
const { step } = require("mocha-steps");

const provider = new Web3.providers.HttpProvider("http://localhost:8545");
const web3 = new Web3(provider);
const { toBN, toWei, toChecksumAddress, randomHex } = web3.utils;

const {
  getConditionId,
  getCollectionId,
  getPositionId,
} = require("@gnosis.pm/conditional-tokens-contracts/utils/id-helpers")(
  web3.utils
);

function getContract(contractName) {
  const C = TruffleContract(
    fs.readJsonSync(
      path.join(__dirname, "..", "build", "contracts", `${contractName}.json`)
    )
  );
  C.setProvider(provider);
  return C;
}

const WETH9 = getContract("WETH9");
const Realitio = getContract("Realitio");
const RealitioProxy = getContract("RealitioProxy");
const RealitioScalarAdapter = getContract("RealitioScalarAdapter");
const ConditionalTokens = getContract("ConditionalTokens");
const FPMMDeterministicFactory = getContract("FPMMDeterministicFactory");
const FixedProductMarketMaker = getContract("FixedProductMarketMaker");
const SimpleCentralizedArbitrator = getContract("SimpleCentralizedArbitrator");
const GeneralizedTCR = getContract("GeneralizedTCR");
const DXTokenRegistry = getContract("DXTokenRegistry");
const GelatoCore = getContract("GelatoCore");

async function queryGraph(query) {
  return (await axios.post("http://localhost:8000/subgraphs", { query })).data
    .data;
}

const subgraphName = "protofire/omen";

async function querySubgraph(query) {
  return (
    await axios.post(`http://localhost:8000/subgraphs/name/${subgraphName}`, {
      query,
    })
  ).data.data;
}

async function waitForGraphSync(targetBlockNumber) {
  if (targetBlockNumber == null)
    targetBlockNumber = await web3.eth.getBlockNumber();

  while (true) {
    await delay(100);
    const {
      subgraphs: [
        {
          currentVersion: {
            id: currentVersionId,
            deployment: { latestEthereumBlockNumber },
          },
          versions: [{ id: latestVersionId }],
        },
      ],
    } = await queryGraph(`{
      subgraphs(
        where: {name: "${subgraphName}"}
        first: 1
      ) {
        currentVersion {
          id
          deployment {
            latestEthereumBlockNumber
          }
        }
        versions(
          orderBy: createdAt,
          orderDirection: desc,
          first: 1
        ) {
          id
        }
      }
    }`);

    if (
      currentVersionId === latestVersionId &&
      latestEthereumBlockNumber == targetBlockNumber
    )
      break;
  }
}

async function getTimestampFromReceipt({ blockHash }) {
  return (await web3.eth.getBlock(blockHash)).timestamp;
}

function advanceTime(time) {
  return new Promise((resolve, reject) => {
    web3.currentProvider.send(
      {
        jsonrpc: "2.0",
        method: "evm_increaseTime",
        params: [time],
        id: new Date().getTime(),
      },
      (err, result) => {
        if (err) {
          return reject(err);
        }
        return resolve(result);
      }
    );
  });
}

function nthRoot(x, n) {
  if (n <= 0) {
    throw new Error(`invalid n ${n} passed to nthRoot`);
  }

  let root = x;
  let deltaRoot;
  do {
    deltaRoot = x
      .div(root.pow(toBN(n - 1)))
      .sub(root)
      .divn(n);
    root = root.add(deltaRoot);
  } while (deltaRoot.ltn(0));

  return root;
}

/** Increases ganache time by the passed duration in seconds and mines a block.
 * @param {number} duration time in seconds
 */
async function increaseTime(duration) {
  await promisify(web3.currentProvider.send.bind(web3.currentProvider))({
    jsonrpc: "2.0",
    method: "evm_increaseTime",
    params: [duration],
    id: new Date().getTime(),
  });

  await advanceBlock();
}

/** Advance to next mined block using `evm_mine`
 * @returns {promise} Promise that block is mined
 */
function advanceBlock() {
  return promisify(web3.currentProvider.send.bind(web3.currentProvider))({
    jsonrpc: "2.0",
    method: "evm_mine",
    id: new Date().getTime(),
  });
}

describe("Omen subgraph", function () {
  function checkMarketMakerState({
    traderParticipated,
    shareholderParticipated,
    creatorParticipated,
    isScalar,
  }) {
    step("check subgraph market maker data matches chain", async function () {
      await waitForGraphSync();

      const mm = isScalar ? scalarFpmm : fpmm;
      const mmCreationTimestamp = isScalar
        ? scalarFpmmCreationTimestamp
        : fpmmCreationTimestamp;
      const condId = isScalar ? scalarConditionId : conditionId;
      const posIds = isScalar ? scalarPositionIds : positionIds;
      const templateId = isScalar ? "1" : "2";

      const { fixedProductMarketMaker } = await querySubgraph(`{
        fixedProductMarketMaker(id: "${mm.address.toLowerCase()}") {
          creator
          creationTimestamp
          collateralToken
          conditions {
            id
          }
          fee
          collateralVolume
          outcomeTokenAmounts
          outcomeTokenMarginalPrices
          outcomeSlotCount
          liquidityParameter
          indexedOnQuestion
          condition {
            id
            question {
              id
            }
          }
          question {
            id
            indexedFixedProductMarketMakers { id }
          }
          scalarLow
          scalarHigh
          templateId
          data
          title
          outcomes
          category
          language
          arbitrator
          openingTimestamp
          timeout
          poolMembers {
            funder {
              id
            }
            amount
          }
          participants {
            participant {
              id
            }
          }
        }
      }`);

      should.exist(fixedProductMarketMaker);
      toChecksumAddress(fixedProductMarketMaker.creator).should.equal(creator);
      Number(fixedProductMarketMaker.creationTimestamp).should.equal(
        mmCreationTimestamp
      );
      toChecksumAddress(fixedProductMarketMaker.collateralToken).should.equal(
        weth.address
      );
      fixedProductMarketMaker.conditions.should.eql([{ id: condId }]);
      fixedProductMarketMaker.fee.should.equal(fee);
      fixedProductMarketMaker.collateralVolume.should.equal(
        runningCollateralVolume.toString()
      );
      const chainOutcomeTokenAmounts = await conditionalTokens.balanceOfBatch(
        new Array(posIds.length).fill(mm.address),
        posIds
      );
      fixedProductMarketMaker.outcomeTokenAmounts.should.eql(
        chainOutcomeTokenAmounts.map((v) => v.toString())
      );
      if (chainOutcomeTokenAmounts.some((v) => v.eqn(0))) {
        should.not.exist(fixedProductMarketMaker.outcomeTokenMarginalPrices);
      } else {
        should.exist(fixedProductMarketMaker.outcomeTokenMarginalPrices);
      }
      fixedProductMarketMaker.outcomeSlotCount.should.equal(
        isScalar ? 2 : outcomeSlotCount
      );
      fixedProductMarketMaker.liquidityParameter.should.equal(
        nthRoot(
          chainOutcomeTokenAmounts.reduce(
            (acc, amount) => acc.mul(amount),
            toBN(1)
          ),
          posIds.length
        ).toString()
      );

      fixedProductMarketMaker.indexedOnQuestion.should.be.true();
      should.exist(fixedProductMarketMaker.condition);
      fixedProductMarketMaker.condition.id.should.equal(condId);
      should.exist(fixedProductMarketMaker.question);
      fixedProductMarketMaker.question.id.should.equal(
        fixedProductMarketMaker.condition.question.id
      );
      fixedProductMarketMaker.question.indexedFixedProductMarketMakers.should.eql(
        [{ id: mm.address.toLowerCase() }]
      );

      if (isScalar) {
        fixedProductMarketMaker.scalarLow.should.equal(scalarLow);
        fixedProductMarketMaker.scalarHigh.should.equal(scalarHigh);
      } else {
        should.not.exist(fixedProductMarketMaker.scalarLow);
        should.not.exist(fixedProductMarketMaker.scalarHigh);
      }
      fixedProductMarketMaker.templateId.should.equal(templateId);
      fixedProductMarketMaker.data.should.equal(
        isScalar ? scalarQuestionData : questionData
      );
      fixedProductMarketMaker.title.should.equal(
        isScalar ? scalarQuestionTitle : questionTitle
      );
      if (isScalar) {
        should.not.exist(fixedProductMarketMaker.outcomes);
      } else {
        should.exist(fixedProductMarketMaker.outcomes);
        fixedProductMarketMaker.outcomes.should.eql(questionOutcomes);
      }
      fixedProductMarketMaker.category.should.equal(questionCategory);
      fixedProductMarketMaker.language.should.equal(questionLanguage);

      fixedProductMarketMaker.arbitrator.should.equal(arbitrator.toLowerCase());
      fixedProductMarketMaker.openingTimestamp.should.equal(
        answerSubmissionOpeningTimestamp.toString()
      );
      fixedProductMarketMaker.timeout.should.equal(
        finalizationTimeout.toString()
      );

      for (const { funder, amount } of fixedProductMarketMaker.poolMembers) {
        if (funder.id === `0x${"0".repeat(40)}`) {
          amount.should.equal((await mm.totalSupply()).neg().toString());
        } else {
          amount.should.equal((await mm.balanceOf(funder.id)).toString());
        }
      }

      if (traderParticipated) {
        fixedProductMarketMaker.participants.should.containEql({
          participant: { id: trader.toLowerCase() },
        });
      }
      if (shareholderParticipated) {
        fixedProductMarketMaker.participants.should.containEql({
          participant: { id: shareholder.toLowerCase() },
        });
      }
      if (creatorParticipated) {
        fixedProductMarketMaker.participants.should.containEql({
          participant: { id: creator.toLowerCase() },
        });
      }
    });
  }

  let creator;
  let trader;
  let shareholder;
  let arbitrator;
  let reporter;
  before("get accounts", async function () {
    [
      creator,
      trader,
      shareholder,
      arbitrator,
      reporter,
    ] = await web3.eth.getAccounts();
  });

  let weth;
  let realitio;
  let oracle;
  let scalarOracle;
  let conditionalTokens;
  let factory;
  let centralizedArbitrator;
  let marketsTCR;
  let dxTokenRegistry;
  let gelatoCore;
  before("get deployed contracts", async function () {
    weth = await WETH9.deployed();
    realitio = await Realitio.deployed();
    oracle = await RealitioProxy.deployed();
    scalarOracle = await RealitioScalarAdapter.deployed();
    conditionalTokens = await ConditionalTokens.deployed();
    factory = await FPMMDeterministicFactory.deployed();
    centralizedArbitrator = await SimpleCentralizedArbitrator.deployed();
    marketsTCR = await GeneralizedTCR.deployed();
    dxTokenRegistry = await DXTokenRegistry.deployed();
    gelatoCore = await GelatoCore.deployed();
  });

  it("exists", async function () {
    const { subgraphs } = await queryGraph(`{
      subgraphs(first: 1, where: {name: "${subgraphName}"}) {
        id
      }
    }`);

    subgraphs.should.be.not.empty();
  });

  let questionId;
  const finalizationTimeout = 100;
  const answerSubmissionOpeningTimestamp = 0;
  const questionData = [
    // title
    "なに!?",
    // outcomes
    ' "Something",\r"nothing, not something..." ,\t\n"A \\"thing\\""',
    // category
    "Cat😈\\u732b\\ud83c\\uDCA1",
    // language
    "en-US",
  ].join("\u241f");
  const questionTitle = "なに!?";
  const questionOutcomes = [
    "Something",
    "nothing, not something...",
    'A "thing"',
  ];
  const questionCategory = "Cat😈猫🂡";
  const questionLanguage = "en-US";
  step("ask question", async function () {
    const nonce = randomHex(32);
    const { receipt, logs } = await realitio.askQuestion(
      2, // <- template ID
      questionData,
      arbitrator,
      finalizationTimeout,
      answerSubmissionOpeningTimestamp,
      nonce,
      { from: creator }
    );
    questionId = logs.find(({ event }) => event === "LogNewQuestion").args
      .question_id;

    await waitForGraphSync();

    const { question } = await querySubgraph(`{
      question(id: "${questionId}") {
        templateId
        data
        title
        outcomes
        category
        language

        arbitrator
        openingTimestamp
        timeout

        currentAnswer
        currentAnswerBond
        currentAnswerTimestamp

        isPendingArbitration

        answerFinalizedTimestamp

        indexedFixedProductMarketMakers { id }

        conditions { id }
      }
    }`);

    question.templateId.should.equal("2");
    question.data.should.equal(questionData);
    question.title.should.equal(questionTitle);
    question.outcomes.should.eql(questionOutcomes);
    question.category.should.equal(questionCategory);
    question.language.should.equal(questionLanguage);

    question.arbitrator.should.equal(arbitrator.toLowerCase());
    question.openingTimestamp.should.equal(
      answerSubmissionOpeningTimestamp.toString()
    );
    question.timeout.should.equal(finalizationTimeout.toString());

    should.not.exist(question.currentAnswer);
    should.not.exist(question.currentAnswerBond);
    should.not.exist(question.currentAnswerTimestamp);

    question.isPendingArbitration.should.be.false();

    should.not.exist(question.answerFinalizedTimestamp);

    question.indexedFixedProductMarketMakers.should.be.empty();

    question.conditions.should.be.empty();
  });

  let scalarQuestionId;
  let scalarConditionQuestionId;
  const scalarQuestionTitle =
    "What is the average land speed of an unladen swallow? (mph)";
  const scalarQuestionData = [
    scalarQuestionTitle,
    questionCategory,
    questionLanguage,
  ].join("\u241f");
  const scalarLow = toWei("5");
  const scalarHigh = toWei("40");
  step("ask scalar question", async function () {
    const nonce = randomHex(32);
    const { logs } = await realitio.askQuestion(
      1, // <- template ID
      scalarQuestionData,
      arbitrator,
      finalizationTimeout,
      answerSubmissionOpeningTimestamp,
      nonce,
      { from: creator }
    );
    scalarQuestionId = logs.find(({ event }) => event === "LogNewQuestion").args
      .question_id;
    scalarConditionQuestionId = web3.utils.keccak256(
      web3.eth.abi.encodeParameters(
        ["bytes32", "uint256", "uint256"],
        [scalarQuestionId, scalarLow, scalarHigh]
      )
    );

    await waitForGraphSync();

    const { question } = await querySubgraph(`{
      question(id: "${scalarQuestionId}") {
        templateId
        data
        title
        outcomes
        category
        language

        arbitrator
        openingTimestamp
        timeout

        currentAnswer
        currentAnswerBond
        currentAnswerTimestamp

        isPendingArbitration

        answerFinalizedTimestamp

        indexedFixedProductMarketMakers { id }

        conditions { id }
      }
    }`);

    question.templateId.should.equal("1");
    question.data.should.equal(scalarQuestionData);
    question.title.should.equal(scalarQuestionTitle);
    should.not.exist(question.outcomes);
    question.category.should.equal(questionCategory);
    question.language.should.equal(questionLanguage);

    question.arbitrator.should.equal(arbitrator.toLowerCase());
    question.openingTimestamp.should.equal(
      answerSubmissionOpeningTimestamp.toString()
    );
    question.timeout.should.equal(finalizationTimeout.toString());

    should.not.exist(question.currentAnswer);
    should.not.exist(question.currentAnswerBond);
    should.not.exist(question.currentAnswerTimestamp);

    question.isPendingArbitration.should.be.false();

    should.not.exist(question.answerFinalizedTimestamp);

    question.indexedFixedProductMarketMakers.should.be.empty();

    question.conditions.should.be.empty();
  });

  step("make scalar condition question ID announcement", async function () {
    await scalarOracle.announceConditionQuestionId(
      scalarQuestionId,
      scalarLow,
      scalarHigh,
      { from: creator }
    );

    await waitForGraphSync();

    const { scalarQuestionLink } = await querySubgraph(`{
      scalarQuestionLink(id: "${scalarConditionQuestionId}") {
        conditionQuestionId
        realityEthQuestionId
        question { id }
        scalarLow
        scalarHigh
      }
    }`);

    scalarQuestionLink.conditionQuestionId.should.equal(
      scalarConditionQuestionId
    );
    scalarQuestionLink.realityEthQuestionId.should.equal(scalarQuestionId);
    scalarQuestionLink.question.should.eql({ id: scalarQuestionId });
    scalarQuestionLink.scalarLow.should.equal(scalarLow);
    scalarQuestionLink.scalarHigh.should.equal(scalarHigh);
  });

  let conditionId, scalarConditionId;
  let positionIds, scalarPositionIds;
  const outcomeSlotCount = 3;
  step("prepare conditions", async function () {
    await conditionalTokens.prepareCondition(
      oracle.address,
      questionId,
      outcomeSlotCount,
      { from: creator }
    );
    await conditionalTokens.prepareCondition(
      scalarOracle.address,
      scalarConditionQuestionId,
      2,
      { from: creator }
    );
    conditionId = getConditionId(oracle.address, questionId, outcomeSlotCount);
    scalarConditionId = getConditionId(
      scalarOracle.address,
      scalarConditionQuestionId,
      2
    );
    positionIds = Array.from({ length: outcomeSlotCount }, (v, i) =>
      getPositionId(weth.address, getCollectionId(conditionId, 1 << i))
    );
    scalarPositionIds = Array.from({ length: 2 }, (v, i) =>
      getPositionId(weth.address, getCollectionId(scalarConditionId, 1 << i))
    );

    await waitForGraphSync();

    const { condition, question } = await querySubgraph(`{
      condition(id: "${conditionId}") {
        oracle
        question {
          title
        }
        outcomeSlotCount
        resolutionTimestamp
        payouts
      }
      question(id: "${questionId}") {
        conditions { id }
      }
    }`);
    condition.oracle.should.equal(oracle.address.toLowerCase());
    condition.question.should.eql({ title: "なに!?" });
    condition.outcomeSlotCount.should.equal(outcomeSlotCount);
    should.not.exist(condition.resolutionTimestamp);
    should.not.exist(condition.payouts);

    question.conditions.should.eql([{ id: conditionId }]);
  });

  let fpmm;
  let fpmmCreationTimestamp;
  const fee = toWei("0.001");
  const initialFunds = toWei("1");
  step("use factory to create market maker", async function () {
    await weth.deposit({ value: initialFunds, from: creator });
    await weth.approve(factory.address, initialFunds, { from: creator });

    const saltNonce = `0x${"1".repeat(64)}`;
    const creationArgs = [
      saltNonce,
      conditionalTokens.address,
      weth.address,
      [conditionId],
      fee,
      initialFunds,
      [],
      { from: creator },
    ];

    const fpmmAddress = await factory.create2FixedProductMarketMaker.call(
      ...creationArgs
    );
    const { receipt } = await factory.create2FixedProductMarketMaker(
      ...creationArgs
    );
    fpmmCreationTimestamp = await getTimestampFromReceipt(receipt);
    fpmm = await FixedProductMarketMaker.at(fpmmAddress);
  });

  checkMarketMakerState({
    traderParticipated: false,
    shareholderParticipated: false,
    creatorParticipated: true,
  });

  step(
    "should not index market makers on different ConditionalTokens",
    async function () {
      const altConditionalTokens = await ConditionalTokens.new({
        from: creator,
      });
      await altConditionalTokens.prepareCondition(
        oracle.address,
        questionId,
        outcomeSlotCount,
        { from: creator }
      );
      await weth.deposit({ value: initialFunds, from: creator });
      await weth.approve(factory.address, initialFunds, { from: creator });

      const saltNonce = `0x${"2".repeat(64)}`;
      const creationArgs = [
        saltNonce,
        altConditionalTokens.address,
        weth.address,
        [conditionId],
        fee,
        initialFunds,
        [],
        { from: creator },
      ];
      const fpmmAddress = await factory.create2FixedProductMarketMaker.call(
        ...creationArgs
      );
      await factory.create2FixedProductMarketMaker(...creationArgs);

      await waitForGraphSync();

      const { fixedProductMarketMaker } = await querySubgraph(`{
      fixedProductMarketMaker(id: "${fpmmAddress.toLowerCase()}") {
        creator
        creationTimestamp
        collateralToken
        fee
        collateralVolume
        outcomeTokenAmounts
        liquidityParameter
      }
    }`);

      should.not.exist(fixedProductMarketMaker);
    }
  );

  let scalarFpmm;
  let scalarFpmmCreationTimestamp;
  step(
    "use factory to create another market maker based on scalar question",
    async function () {
      await weth.deposit({ value: initialFunds, from: creator });
      await weth.approve(factory.address, initialFunds, { from: creator });

      const saltNonce = `0x${"1".repeat(64)}`;
      const creationArgs = [
        saltNonce,
        conditionalTokens.address,
        weth.address,
        [scalarConditionId],
        fee,
        initialFunds,
        [],
        { from: creator },
      ];

      const fpmmAddress = await factory.create2FixedProductMarketMaker.call(
        ...creationArgs
      );
      const { receipt } = await factory.create2FixedProductMarketMaker(
        ...creationArgs
      );
      scalarFpmmCreationTimestamp = await getTimestampFromReceipt(receipt);
      scalarFpmm = await FixedProductMarketMaker.at(fpmmAddress);
    }
  );

  checkMarketMakerState({
    traderParticipated: false,
    shareholderParticipated: false,
    creatorParticipated: true,
    isScalar: true,
  });

  const runningCollateralVolume = toBN(0);
  const investmentAmount = toWei("1");
  step("have trader buy from market maker", async function () {
    await weth.deposit({ value: investmentAmount, from: trader });
    await weth.approve(fpmm.address, investmentAmount, { from: trader });

    const buyAmount = await fpmm.calcBuyAmount(investmentAmount, 0);
    await fpmm.buy(investmentAmount, 0, buyAmount, { from: trader });
    runningCollateralVolume.iadd(toBN(investmentAmount)).isub(
      toBN(investmentAmount)
        .mul(toBN(fee))
        .div(toBN(toWei("1")))
    );

    await waitForGraphSync();

    const { fixedProductMarketMaker } = await querySubgraph(`{
      fixedProductMarketMaker(id: "${fpmm.address.toLowerCase()}") {
        collateralVolume
      }
    }`);

    fixedProductMarketMaker.collateralVolume.should.equal(
      runningCollateralVolume.toString()
    );
  });

  checkMarketMakerState({
    traderParticipated: true,
    shareholderParticipated: false,
    creatorParticipated: true,
  });

  const returnAmount = toWei("0.5");
  step("have trader sell to market maker", async function () {
    await conditionalTokens.setApprovalForAll(fpmm.address, true, {
      from: trader,
    });

    const sellAmount = await fpmm.calcSellAmount(returnAmount, 0);
    await fpmm.sell(returnAmount, 0, sellAmount, { from: trader });
    runningCollateralVolume.iadd(toBN(returnAmount)).iadd(
      toBN(returnAmount)
        .mul(toBN(fee))
        .div(toBN(toWei("1")).sub(toBN(fee)))
    );

    await waitForGraphSync();

    const { fixedProductMarketMaker } = await querySubgraph(`{
      fixedProductMarketMaker(id: "${fpmm.address.toLowerCase()}") {
        collateralVolume
      }
    }`);

    fixedProductMarketMaker.collateralVolume.should.equal(
      runningCollateralVolume.toString()
    );
  });

  checkMarketMakerState({
    traderParticipated: true,
    shareholderParticipated: false,
    creatorParticipated: true,
  });

  step("transfer pool shares", async function () {
    const shareholderPoolAmount = toWei("0.5");
    await fpmm.transfer(shareholder, shareholderPoolAmount, { from: creator });

    await waitForGraphSync();

    const creatorMembershipId = `${fpmm.address}${creator}`.toLowerCase();
    const shareholderMembershipId = `${fpmm.address}${shareholder}`.toLowerCase();
    const { creatorMembership, shareholderMembership } = await querySubgraph(`{
      creatorMembership: fpmmPoolMembership(id: "${creatorMembershipId}") {
        amount
      }
      shareholderMembership: fpmmPoolMembership(id: "${shareholderMembershipId}") {
        amount
      }
    }`);

    (await fpmm.balanceOf(shareholder))
      .toString()
      .should.equal(shareholderPoolAmount)
      .and.equal(shareholderMembership.amount);
    (await fpmm.balanceOf(creator))
      .toString()
      .should.equal(creatorMembership.amount);
  });

  checkMarketMakerState({
    traderParticipated: true,
    shareholderParticipated: true,
    creatorParticipated: true,
  });

  step("submit answer", async function () {
    const answer = `0x${"0".repeat(63)}1`;
    const bond = toWei("1");
    const { receipt } = await realitio.submitAnswer(questionId, answer, 0, {
      from: reporter,
      value: bond,
    });

    await waitForGraphSync();

    const { question, fixedProductMarketMaker } = await querySubgraph(`{
      question(id: "${questionId}") {
        currentAnswer
        currentAnswerBond
        currentAnswerTimestamp
        answerFinalizedTimestamp
      }
      fixedProductMarketMaker(id: "${fpmm.address.toLowerCase()}") {
        currentAnswer
        currentAnswerBond
        currentAnswerTimestamp
        answerFinalizedTimestamp
      }
    }`);

    timestamp = await getTimestampFromReceipt(receipt);
    finalizedTimestamp = timestamp + finalizationTimeout;

    question.currentAnswer.should.equal(answer);
    question.currentAnswerBond.should.equal(bond);
    question.currentAnswerTimestamp.should.equal(timestamp.toString());
    question.answerFinalizedTimestamp.should.equal(
      finalizedTimestamp.toString()
    );
    fixedProductMarketMaker.currentAnswer.should.equal(answer);
    fixedProductMarketMaker.currentAnswerBond.should.equal(bond);
    fixedProductMarketMaker.currentAnswerTimestamp.should.equal(
      timestamp.toString()
    );
    fixedProductMarketMaker.answerFinalizedTimestamp.should.equal(
      finalizedTimestamp.toString()
    );
  });

  step("resolve condition", async function () {
    await advanceTime(finalizationTimeout);

    const {
      receipt: { blockHash },
    } = await oracle.resolve(questionId, 2, questionData, 3, {
      from: reporter,
    });
    const { timestamp } = await web3.eth.getBlock(blockHash);

    await waitForGraphSync();

    const { condition, fixedProductMarketMaker } = await querySubgraph(`{
      condition(id: "${conditionId}") {
        resolutionTimestamp
        payouts
      }
      fixedProductMarketMaker(id: "${fpmm.address.toLowerCase()}") {
        resolutionTimestamp
        payouts
      }
    }`);
    condition.resolutionTimestamp.should.equal(timestamp.toString());
    condition.payouts.should.deepEqual(["0", "1", "0"]);
    fixedProductMarketMaker.resolutionTimestamp.should.equal(
      timestamp.toString()
    );
    fixedProductMarketMaker.payouts.should.eql(["0", "1", "0"]);
  });

  step("curate market", async function () {
    const columns = [
      {
        label: "Question",
        type: ItemTypes.TEXT,
      },
      {
        label: "Market URL",
        type: ItemTypes.LINK,
      },
    ]; // This information can be found in the TCR meta evidence.
    const marketData = {
      Question:
        "Will Bitcoin dominance be below 50% at any time in January 2021 according to https://coinmarketcap.com/charts/#dominance-percentage",
      "Market URL": `https://omen.eth.link/#/${fpmm.address}`,
    };

    const arbitrationCost = await centralizedArbitrator.arbitrationCost("0x00");
    await marketsTCR.addItem(gtcrEncode({ columns, values: marketData }), {
      from: creator,
      value: arbitrationCost,
    });

    await advanceBlock();
    await waitForGraphSync();
    expect(
      (
        await querySubgraph(`{
      fixedProductMarketMaker(id: "${fpmm.address.toLowerCase()}") {
        klerosTCRregistered
        curatedByDxDaoOrKleros
      }
    }`)
      ).fixedProductMarketMaker
    ).to.deep.equal({
      klerosTCRregistered: false,
      curatedByDxDaoOrKleros: false,
    });

    await increaseTime(1);
    const itemID = await marketsTCR.itemList(0);
    await marketsTCR.challengeRequest(itemID, "", {
      from: creator,
      value: arbitrationCost,
    });

    await advanceBlock();
    await waitForGraphSync();
    expect(
      (
        await querySubgraph(`{
      fixedProductMarketMaker(id: "${fpmm.address.toLowerCase()}") {
        klerosTCRregistered
        curatedByDxDaoOrKleros
      }
    }`)
      ).fixedProductMarketMaker
    ).to.deep.equal({
      klerosTCRregistered: false,
      curatedByDxDaoOrKleros: false,
    });

    const [ACCEPT, REJECT] = [1, 2]; // Possible rulings
    await centralizedArbitrator.rule(0, ACCEPT, { from: creator });

    await advanceBlock();
    await waitForGraphSync();
    expect(
      (
        await querySubgraph(`{
      fixedProductMarketMaker(id: "${fpmm.address.toLowerCase()}") {
        klerosTCRregistered
        curatedByDxDaoOrKleros
      }
    }`)
      ).fixedProductMarketMaker
    ).to.deep.equal({
      klerosTCRregistered: true,
      curatedByDxDaoOrKleros: true,
    });

    increaseTime(10);
    await marketsTCR.removeItem(itemID, "", {
      from: creator,
      value: arbitrationCost,
    });
    await advanceBlock();
    await waitForGraphSync();
    expect(
      (
        await querySubgraph(`{
      fixedProductMarketMaker(id: "${fpmm.address.toLowerCase()}") {
        klerosTCRregistered
        curatedByDxDaoOrKleros
        curatedByDxDao
      }
    }`)
      ).fixedProductMarketMaker
    ).to.deep.equal({
      klerosTCRregistered: true,
      curatedByDxDaoOrKleros: true,
      curatedByDxDao: false,
    });

    increaseTime(10);
    await marketsTCR.executeRequest(itemID, { from: creator });
    await advanceBlock();
    await waitForGraphSync();
    expect(
      (
        await querySubgraph(`{
      fixedProductMarketMaker(id: "${fpmm.address.toLowerCase()}") {
        klerosTCRregistered
        curatedByDxDaoOrKleros
        curatedByDxDao
      }
    }`)
      ).fixedProductMarketMaker
    ).to.deep.equal({
      klerosTCRregistered: false,
      curatedByDxDaoOrKleros: false,
      curatedByDxDao: false,
    });

    // DXTokenRegistryMapping only handles AddToken for the 4th list.
    // Add some lists.
    await dxTokenRegistry.addList("List 1", { from: creator });
    await dxTokenRegistry.addList("List 2", { from: creator });
    await dxTokenRegistry.addList("List 3", { from: creator });
    await dxTokenRegistry.addList("List 4", { from: creator });

    await dxTokenRegistry.addTokens(4, [fpmm.address], { from: creator });
    await advanceBlock();
    await waitForGraphSync();
    expect(
      (
        await querySubgraph(`{
      fixedProductMarketMaker(id: "${fpmm.address.toLowerCase()}") {
        curatedByDxDaoOrKleros
        curatedByDxDao
        klerosTCRregistered
      }
    }`)
      ).fixedProductMarketMaker
    ).to.deep.equal({
      curatedByDxDaoOrKleros: true,
      curatedByDxDao: true,
      klerosTCRregistered: false,
    });

    await dxTokenRegistry.removeTokens(4, [fpmm.address], { from: creator });
    await advanceBlock();
    await waitForGraphSync();
    expect(
      (
        await querySubgraph(`{
      fixedProductMarketMaker(id: "${fpmm.address.toLowerCase()}") {
        curatedByDxDaoOrKleros
        curatedByDxDao
        klerosTCRregistered
      }
    }`)
      ).fixedProductMarketMaker
    ).to.deep.equal({
      curatedByDxDaoOrKleros: false,
      curatedByDxDao: false,
      klerosTCRregistered: false,
    });

    // Test that having one market is enough for klerosTCRregistered to be true.
    await marketsTCR.addItem(gtcrEncode({ columns, values: marketData }), {
      from: creator,
      value: arbitrationCost,
    });
    const marketBData = {
      Question: "Will Ethereum 2.0 Phase 0 launch before 2021?",
      "Market URL": `https://omen.eth.link/#/${fpmm.address}`,
    };
    await marketsTCR.addItem(gtcrEncode({ columns, values: marketBData }), {
      from: creator,
      value: arbitrationCost,
    });
    increaseTime(10);
    await marketsTCR.executeRequest(itemID, { from: creator });
    const itemIDB = await marketsTCR.itemList(1);
    await marketsTCR.executeRequest(itemIDB, { from: creator });

    await marketsTCR.removeItem(itemIDB, "", {
      from: creator,
      value: arbitrationCost,
    });
    increaseTime(10);
    await marketsTCR.executeRequest(itemIDB, { from: creator });

    await advanceBlock();
    await waitForGraphSync();
    expect(
      (
        await querySubgraph(`{
      fixedProductMarketMaker(id: "${fpmm.address.toLowerCase()}") {
        klerosTCRregistered
        curatedByDxDaoOrKleros
      }
    }`)
      ).fixedProductMarketMaker
    ).to.deep.equal({
      klerosTCRregistered: true,
      curatedByDxDaoOrKleros: true,
    });
  });

  step("submit task to gelato", async function () {
    const zeroAddress = "0x0000000000000000000000000000000000000000";

    const provider = {
      addr: zeroAddress,
      module: zeroAddress,
    };

    const condition = {
      inst: zeroAddress,
      data: zeroAddress,
    };

    const action = {
      addr: zeroAddress,
      data: zeroAddress,
      operation: 0,
      dataFlow: 0,
      value: 0,
      termsOkCheck: false,
    };

    const task = {
      conditions: [condition],
      actions: [action],
      selfProviderGasLimit: 0,
      selfProviderGasPriceCeil: 0,
    };

    const {
      receipt: { blockHash },
      logs,
    } = await gelatoCore.submitTask(provider, task, 0, { from: reporter });

    const submissionArgs = logs.find(
      ({ event }) => event === "LogTaskSubmitted"
    ).args;

    // console.log(submissionArgs);

    await web3.eth.getBlock(blockHash);

    await waitForGraphSync();

    const data = await querySubgraph(`{
      taskReceiptWrappers {
        id
        taskReceipt {
          id
          userProxy
          provider {
            addr
            module
          }
          index
          tasks {
            conditions {
              inst
              data
            }
            actions {
              addr
              data
              operation
              dataFlow
              value
              termsOkCheck
            }
            selfProviderGasLimit
            selfProviderGasPriceCeil
          }
          expiryDate
          cycleId
          submissionsLeft
        }
        submissionHash
        status
        submissionDate
        executionDate
        executionHash
        selfProvided
      }
    }`);
    // Data is empty, should be showing the task receipt we submitted
  });
});
