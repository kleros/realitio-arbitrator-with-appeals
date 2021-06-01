// SPDX-License-Identifier: MIT

/**
 *  @authors: [@ferittuncer]
 *  @reviewers: [@unknownunknown1*, @hbarcelos, @MerlinEgalite*, @shalzz]
 *  @auditors: []
 *  @bounties: []
 *  @deployments: []
 */

pragma solidity ^0.7.0;
pragma abicoder v2;

import "./IRealitio.sol";
import "./RealitioArbitratorWithAppealsBase.sol";

/**
 *  @title Realitio_v2_1_ArbitratorWithAppeals
 *  @dev A Realitio arbitrator implementation that uses Realitio v2.1 and Kleros. It notifies Realitio contract for arbitration requests and creates corresponding dispute on Kleros.
 *  Transmits Kleros ruling to Realitio contract. Maintains crowdfunded appeals and notifies Kleros contract. Provides a function to submit evidence for Kleros dispute.
 *  There is a conversion between Kleros ruling and Realitio answer and there is a need for shifting by 1. This is because ruling 0 in Kleros signals tie or no-ruling but in Realitio 0 is a valid answer.
 *  For reviewers this should be a focus as it's quite easy to get confused. Any mistakes on this conversion will render this contract useless.
 *  NOTE: This contract trusts the Kleros arbitrator and Realitio.
 */
contract Realitio_v2_1_ArbitratorWithAppeals is RealitioArbitratorWithAppealsBase {
    /** @dev Constructor.
     *  @param _realitio The address of the Realitio contract.
     *  @param _metadata The metadata required for RealitioArbitrator.
     *  @param _arbitrator The address of the ERC792 arbitrator.
     *  @param _arbitratorExtraData The extra data used to raise a dispute in the ERC792 arbitrator.
     */
    constructor(
        IRealitio _realitio,
        string memory _metadata,
        IArbitrator _arbitrator,
        bytes memory _arbitratorExtraData
    ) RealitioArbitratorWithAppealsBase(_realitio, _metadata, _arbitrator, _arbitratorExtraData) {}

    /** @dev Reports the answer to a specified question from the Kleros arbitrator to the Realitio v2.1 contract.
     *  This can be called by anyone, after the dispute gets a ruling from Kleros.
        We can't directly call `assignWinnerAndSubmitAnswerByArbitrator` inside `rule` because of extra parameters (e.g. _lastHistoryHash).
     *  @param _questionID The ID of Realitio question.
     *  @param _lastHistoryHash The history hash given with the last answer to the question in the Realitio contract.
     *  @param _lastAnswerOrCommitmentID The last answer given, or its commitment ID if it was a commitment, to the question in the Realitio contract, in bytes32.
     *  @param _lastAnswerer The last answerer to the question in the Realitio contract.
     */
    function reportAnswer(
        bytes32 _questionID,
        bytes32 _lastHistoryHash,
        bytes32 _lastAnswerOrCommitmentID,
        address _lastAnswerer
    ) external {
        ArbitrationRequest storage arbitrationRequest = arbitrationRequests[uint256(_questionID)];
        require(arbitrationRequest.status == Status.Ruled, "The status should be Ruled.");

        arbitrationRequest.status = Status.Reported;

        // Note that answer(ruling) is shift by -1 before calling Realitio.
        realitio.assignWinnerAndSubmitAnswerByArbitrator(
            _questionID,
            bytes32(arbitrationRequest.answer - 1),
            arbitrationRequest.requester,
            _lastHistoryHash,
            _lastAnswerOrCommitmentID,
            _lastAnswerer
        );
    }

    /* Private Views */
}
