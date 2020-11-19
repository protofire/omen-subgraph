const seed = process.env.SEED || 'myth like bonus scare over problem client lizard pioneer submit female collect';
const HDWalletProvider = require('@truffle/hdwallet-provider');

const networks = Object.assign(...[
  [1, 'mainnet'],
  [3, 'ropsten'],
  [4, 'rinkeby'],
  [5, 'goerli', `${2e9}`],
  [42, 'kovan'],
  [77, 'sokol'],
].map(([networkId, network, gasPrice]) => ({
  [network]: {
    network_id: networkId,
    gasPrice,
    provider: () => new HDWalletProvider(
      seed,
      `https://sokol.poa.network`,
    ),
  },
})), {
  development: {
    host: 'localhost',
    port: 8545,
    network_id: '*',
  },
  compilers: {
    solc: {
      version: "0.5.16",
    },
  },
});

module.exports = { networks };
