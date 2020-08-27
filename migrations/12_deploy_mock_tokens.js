module.exports = function(deployer) {
  deployer.deploy(artifacts.require('DAI'));
  deployer.deploy(artifacts.require('USDC'));
  deployer.deploy(artifacts.require('USDT'));
};
