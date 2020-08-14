module.exports = function(deployer, _, accounts) {
  deployer.deploy(
    artifacts.require('GeneralizedTCR'),
    artifacts.require('SimpleCentralizedArbitrator').address, // Arbitrator to resolve potential disputes. The arbitrator is trusted to support appeal periods and not reenter.
    '0x00', // Extra data for the trusted arbitrator contract.
    accounts[0], // Connected TCR is not used (any address here works). // The address of the TCR that stores related TCR addresses. This parameter can be left empty.
    '', // The URI of the meta evidence object for registration requests.
    '', // The URI of the meta evidence object for clearing requests.
    accounts[0], // The trusted governor of this contract.
    0, // The base deposit to submit an item.
    0, // The base deposit to remove an item.
    0, // The base deposit to challenge a submission.
    0, // The base deposit to challenge a removal request.
    5, // The time in seconds parties have to challenge a request.
    [0, 0, 0] // Multipliers of the arbitration cost in basis points (see MULTIPLIER_DIVISOR) as follows:
  )
};
