const GelatoCore = artifacts.require("GelatoCore");
const GelatoGasPriceOracle = artifacts.require("GelatoGasPriceOracle");

module.exports = async function(deployer) {
  await deployer.deploy(GelatoGasPriceOracle, 21)
  await deployer.deploy(GelatoCore, { 
      gelatoGasPriceOracle: GelatoGasPriceOracle.address, 
      oracleRequestData: "0x0",
      gelatoMaxGas: 21000,
      internalGasRequirement: 21000,
      minExecutorStake: 0,
      executorSuccessShare: 0,
      sysAdminSuccessShare: 0,
      totalSuccessShare: 0
    });
};
