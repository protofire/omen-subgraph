const seed = process.env.SEED || 'myth like bonus scare over problem client lizard pioneer submit female collect';
const HDWalletProvider = require('@truffle/hdwallet-provider');

const networks = Object.assign(...[
  [1, 'mainnet'],
  [3, 'ropsten'],
  [4, 'rinkeby'],
  [5, 'goerli', `${2e9}`],
  [42, 'kovan'],
  [77, 'sokol',, 'https://sokol.poa.network'],
  [100, 'xdai',, 'https://lively-empty-wind.xdai.quiknode.pro/827b90b45d544848ea8a880d30567297d3c9ef6e/'],
].map(([networkId, network, gasPrice, rpcUrl]) => ({
  [network]: {
    network_id: networkId,
    gasPrice,
    provider: () => new HDWalletProvider(
      seed,
      rpcUrl || `https://${network}.infura.io/v3/17d5bb5953564f589d48d535f573e486`,
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
      // settings: {
      //   optimizer: {
      //     enabled: true,
      //     runs: 1500
      //   }
      // }
    },
  },
});

module.exports = { networks };
