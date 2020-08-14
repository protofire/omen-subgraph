const Web3 = require('web3');
const TruffleContract = require("@truffle/contract");
const { default: axios } = require('axios');
const delay = require('delay');
const fs = require('fs-extra');
const path = require('path');
const { gtcrEncode, ItemTypes } = require('@kleros/gtcr-encoder');
const { expect } = require('chai');
const { promisify } = require('util')

const provider = new Web3.providers.HttpProvider("http://localhost:8545");
const web3 = new Web3(provider);

function getContract(contractName) {
  const C = TruffleContract(fs.readJsonSync(path.join(
    __dirname, '..', 'build', 'contracts', `${contractName}.json`
  )));
  C.setProvider(provider);
  return C;
}

const SimpleCentralizedArbitrator = getContract('SimpleCentralizedArbitrator');
const GeneralizedTCR = getContract('GeneralizedTCR');

async function queryGraph(query) {
  return (await axios.post('http://localhost:8000/subgraphs', { query })).data.data;
}

const subgraphName = 'protofire/omen';

async function querySubgraph(query) {
  return (await axios.post(`http://localhost:8000/subgraphs/name/${subgraphName}`, { query })).data.data;
}

async function waitForGraphSync(targetBlockNumber) {
  if (targetBlockNumber == null)
    targetBlockNumber = await web3.eth.getBlockNumber();

  while(true) {
    await delay(100);
    const {
      subgraphs: [{
        currentVersion: {
          id: currentVersionId,
          deployment: {
            latestEthereumBlockNumber
          }
        },
        versions: [{ id: latestVersionId }]
      }]
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

    if(
      currentVersionId === latestVersionId &&
      latestEthereumBlockNumber == targetBlockNumber
    )
      break;
  }
}

/** Increases ganache time by the passed duration in seconds
 * @param {number} duration time in seconds
 */
async function increase (duration) {
  await promisify(web3.currentProvider.send.bind(web3.currentProvider))({
    jsonrpc: '2.0',
    method: 'evm_increaseTime',
    params: [duration],
    id: new Date().getTime(),
  });

  await advanceBlock();
}

/** Advance to next mined block using `evm_mine`
 * @returns {promise} Promise that block is mined
 */
function advanceBlock () {
  return promisify(web3.currentProvider.send.bind(web3.currentProvider))({
    jsonrpc: '2.0',
    method: 'evm_mine',
    id: new Date().getTime(),
  });
}

describe('Curate subgraph', function() {
  before('get accounts', async function() {
    [creator] = await web3.eth.getAccounts();
  });

  let centralizedArbitrator;
  let marketsTCR;
  before('get deployed contracts', async function() {
    centralizedArbitrator = await SimpleCentralizedArbitrator.deployed();
    marketsTCR = await GeneralizedTCR.deployed()
  });

  it('registers markets properly', async function() {
    const columns = [
      {
        "label": "Question",
        "type": ItemTypes.TEXT,
      },
      {
        "label": "Market URL",
        "type": ItemTypes.LINK,
      }
    ] // This information can be found in the TCR meta evidence.
    const inputValues = [{
      Question: 'Will Bitcoin dominance be below 50% at any time in January 2021 according to https://coinmarketcap.com/charts/#dominance-percentage',
      'Market URL':'https://omen.eth.link/#/0x8e0eec0539889a225ca163d36bbf1b44264d863e'
    }, {
      Question: 'Will there be a day with at least 1000 reported Corona death in the US in the first 14 days of July?',
      'Market URL':'https://omen.eth.link/#/0xffbc624070cb014420a6f7547fd05dfe635e2db2'
    }, {
      Question: 'When will Ethereum 2.0 Phase 0 launch?',
      'Market URL':'https://omen.eth.link/#/0xe82b9b5991e31167b9fd96f6da8ec36f33cd290f'
    }, {
      Question: 'How will the Kleros court rule in case 302? (1000 corona death)',
      'Market URL':'https://omen.eth.link/#/0xf45d703b2f695280e21605dbee2db5ebcb08d469'
    }]


    const arbitrationCost = await centralizedArbitrator.arbitrationCost('0x00')
    await marketsTCR.addItem(gtcrEncode({ columns, values: inputValues[0] }), { from: creator, value: arbitrationCost})
    await marketsTCR.addItem(gtcrEncode({ columns, values: inputValues[1] }), { from: creator, value: arbitrationCost})
    await marketsTCR.addItem(gtcrEncode({ columns, values: inputValues[2] }), { from: creator, value: arbitrationCost})
    await marketsTCR.addItem(gtcrEncode({ columns, values: inputValues[3] }), { from: creator, value: arbitrationCost})

    const itemIDA = await marketsTCR.itemList(0)
    const itemIDB = await marketsTCR.itemList(1)
    const itemIDC = await marketsTCR.itemList(2)
    const itemIDD = await marketsTCR.itemList(3)

    await increase(1)
    await marketsTCR.challengeRequest(itemIDA, '', { from: creator, value: arbitrationCost })

    await increase(6)
    await marketsTCR.executeRequest(itemIDB, { from: creator })
    await marketsTCR.executeRequest(itemIDC, { from: creator })
    await marketsTCR.executeRequest(itemIDD, { from: creator })

    await marketsTCR.removeItem(itemIDC, '', { from: creator, value: arbitrationCost })
    await marketsTCR.removeItem(itemIDD, '', { from: creator, value: arbitrationCost })

    await increase(1)
    await marketsTCR.challengeRequest(itemIDC, '', { from: creator, value: arbitrationCost })

    await increase(6)
    await marketsTCR.executeRequest(itemIDD, { from: creator })

    await advanceBlock()
    await waitForGraphSync();
    const { curatedMarket: challengedRegistration } = await querySubgraph(`{
      curatedMarket(id: "0x8e0eec0539889a225ca163d36bbf1b44264d863e") {
        itemID
        registered
        status
      }
    }`)

    const { curatedMarket: acceptedRegistration } = await querySubgraph(`{
      curatedMarket(id: "0xffbc624070cb014420a6f7547fd05dfe635e2db2") {
        itemID
        registered
        status
      }
    }`)

    const { curatedMarket: challengedRemoval } = await querySubgraph(`{
      curatedMarket(id: "0xe82b9b5991e31167b9fd96f6da8ec36f33cd290f") {
        itemID
        registered
        status
      }
    }`)

    const { curatedMarket: acceptedRemoval } = await querySubgraph(`{
      curatedMarket(id: "0xf45d703b2f695280e21605dbee2db5ebcb08d469") {
        itemID
        registered
        status
      }
    }`)

    const [ABSENT, REGISTERED, REGISTRATION_REQUESTED, REMOVAL_REQUESTED] = [0, 1, 2, 3]

    expect(challengedRegistration.status).to.equal(REGISTRATION_REQUESTED)
    expect(acceptedRegistration.status).to.equal(REGISTERED)
    expect(challengedRemoval.status).to.equal(REMOVAL_REQUESTED)
    expect(acceptedRemoval.status).to.equal(ABSENT)

    expect(challengedRegistration.registered).to.equal(false)
    expect(acceptedRegistration.registered).to.equal(true)
    expect(challengedRemoval.registered).to.equal(true)
    expect(acceptedRemoval.registered).to.equal(false)

    const [ACCEPT, REJECT] = [1, 2] // Possible rulings

    await centralizedArbitrator.rule(0, ACCEPT, { from: creator })
    await centralizedArbitrator.rule(1, REJECT, { from: creator })

    await advanceBlock()
    await waitForGraphSync();
    const { curatedMarket: resolvedRegistration } = await querySubgraph(`{
      curatedMarket(id: "0x8e0eec0539889a225ca163d36bbf1b44264d863e") {
        itemID
        registered
        status
      }
    }`)

    const { curatedMarket: resolvedRemoval } = await querySubgraph(`{
      curatedMarket(id: "0xe82b9b5991e31167b9fd96f6da8ec36f33cd290f") {
        itemID
        registered
        status
      }
    }`)

    expect(resolvedRegistration.status).to.equal(1)
    expect(resolvedRemoval.status).to.equal(1)
    expect(resolvedRegistration.registered).to.equal(true)
    expect(resolvedRemoval.registered).to.equal(true)
  })
});
