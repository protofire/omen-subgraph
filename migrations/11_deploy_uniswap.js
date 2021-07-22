module.exports = function (deployer, _, [feeToSetter]) {
  deployer.deploy(artifacts.require("UniswapV2Factory"), feeToSetter);
  deployer.deploy(artifacts.require("SwaprFactory"), feeToSetter);
};
