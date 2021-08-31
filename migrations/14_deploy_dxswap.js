module.exports = function (deployer, _, [feeToSetter]) {
  deployer.deploy(artifacts.require("DXswapFactory"), feeToSetter);
};
