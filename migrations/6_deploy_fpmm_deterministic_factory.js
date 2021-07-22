module.exports = function (deployer) {
  deployer.deploy(artifacts.require("FPMMDeterministicFactory"));
  deployer.deploy(artifacts.require("FPMMDeterministicFactoryV2"));
};
