module.exports = function(deployer, _, accounts) {
  deployer.deploy(
    artifacts.require('GeneralizedTCR'),
    artifacts.require('SimpleCentralizedArbitrator').address,
    '0x00',
    accounts[0], // Connected TCR is not used (any address here works).
    '',
    '',
    accounts[0],
    0,
    0,
    0,
    0,
    0,
    [0, 0, 0]
  )  
};
