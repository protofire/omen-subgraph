module.exports = function(deployer) {
  const ConditionalTokens = artifacts.require('ConditionalTokens');
  const Realitio = artifacts.require('Realitio');

  deployer.deploy(
    artifacts.require('RealitioProxy'),
    ConditionalTokens.address,
    Realitio.address,
    5,
  );
  deployer.deploy(
    artifacts.require('RealitioScalarAdapter'),
    ConditionalTokens.address,
    Realitio.address,
  );
};
