// SPDX-License-Identifier: MIT

/**
 *  @authors: [@ferittuncer]
 *  @reviewers: [@unknownunknown1*, @hbarcelos*, @MerlinEgalite*, @shalzz, @fnanni-0]
 *  @auditors: []
 *  @bounties: []
 *  @deployments: []
 */

pragma solidity ^0.7.0;

import "./IRealitio.sol";
import "./RealitioArbitratorWithAppealsBase.sol";

/**
 *  @title Realitio_v2_0_ArbitratorWithAppeals
 *  @dev A Realitio arbitrator implementation that uses Realitio v2.0 and Kleros.
 *  It notifies Realitio contract for arbitration requests and creates corresponding dispute on Kleros. Transmits Kleros ruling to Realitio contract.
 *  Maintains crowdfunded appeals and notifies Kleros contract. Provides a function to submit evidence for Kleros dispute.
 *  There is a conversion between Kleros ruling and Realitio answer and there is a need for shifting by 1. This is because ruling 0 in Kleros signals tie or no-ruling but in Realitio 0 is a valid answer.
 *  For reviewers this should be a focus as it's quite easy to get confused. Any mistakes on this conversion will render this contract useless.
 *  NOTE: This contract trusts the Kleros arbitrator and Realitio.
 */
contract Realitio_v2_0_ArbitratorWithAppeals is RealitioArbitratorWithAppealsBase {
    /** @dev Constructor.
     *  @param _realitio The address of the Realitio contract.
     *  @param _metadata The metadata required for RealitioArbitrator.
     *  @param _arbitrator The address of the ERC792 arbitrator.
     *  @param _arbitratorExtraData The extra data used to raise a dispute in the ERC792 arbitrator.
     *  @param _metaevidence Metaevidence as defined in ERC-1497.
     */
    constructor(
        IRealitio _realitio,
        string memory _metadata,
        IArbitrator _arbitrator,
        bytes memory _arbitratorExtraData,
        string memory _metaevidence
    ) RealitioArbitratorWithAppealsBase(_realitio, _metadata, _arbitrator, _arbitratorExtraData, _metaevidence) {}

    /** @dev Compute winner and report the answer to a specified question from the ERC792 arbitrator to the Realitio v2.0 contract. TRUSTED.
     *  @param _questionID The ID of the question.
     *  @param _lastHistoryHash The history hash given with the last answer to the question in the Realitio contract.
     *  @param _lastAnswerOrCommitmentID The last answer given, or its commitment ID if it was a commitment, to the question in the Realitio contract.
     *  @param _lastBond The bond paid for the last answer to the question in the Realitio contract.
     *  @param _lastAnswerer The last answerer to the question in the Realitio contract.
     *  @param _isCommitment Whether the last answer to the question in the Realitio contract used commit or reveal or not. True if it did, false otherwise.
     */
    function computeWinnerAndReportAnswer(
        bytes32 _questionID,
        bytes32 _lastHistoryHash,
        bytes32 _lastAnswerOrCommitmentID,
        uint256 _lastBond,
        address _lastAnswerer,
        bool _isCommitment
    ) external {
        ArbitrationRequest storage arbitrationRequest = arbitrationRequests[uint256(_questionID)];
        require(arbitrationRequest.status == Status.Ruled, "The status should be Ruled.");
        require(
            realitio.getHistoryHash(_questionID) == keccak256(abi.encodePacked(_lastHistoryHash, _lastAnswerOrCommitmentID, _lastBond, _lastAnswerer, _isCommitment)),
            "The hash of the history parameters supplied does not match the one stored in the Realitio contract."
        ); // This is normally Realitio's responsibility to check but it does not, so we do instead. This is fixed in v2.1.

        arbitrationRequest.status = Status.Reported;

        // Note that ruling is shifted by -1 before calling Realitio. This works because 0-1 is equivalent to type(uint256).max. However, this won't be the case starting from Solidity 0.8.x.
        // https://docs.soliditylang.org/en/v0.8.0/080-breaking-changes.html
        realitio.submitAnswerByArbitrator(_questionID, bytes32(arbitrationRequest.ruling - 1), computeWinner(arbitrationRequest, _lastAnswerOrCommitmentID, _lastBond, _lastAnswerer, _isCommitment));
    }

    /** @dev Computes the Realitio answerer, of a specified question, that should win. This function is needed to avoid the "stack too deep error". TRUSTED.
     *  @param _arbitrationRequest Arbitration request to compute it's winner.
     *  @param _lastAnswerOrCommitmentID The last answer given, or its commitment ID if it was a commitment, to the question in the Realitio contract.
     *  @param _lastBond The bond paid for the last answer to the question in the Realitio contract.
     *  @param _lastAnswerer The last answerer to the question in the Realitio contract.
     *  @param _isCommitment Whether the last answer to the question in the Realitio contract used commit or reveal or not. True if it did, false otherwise.
     *  @return winner The computed winner.
     */
    function computeWinner(
        ArbitrationRequest storage _arbitrationRequest,
        bytes32 _lastAnswerOrCommitmentID,
        uint256 _lastBond,
        address _lastAnswerer,
        bool _isCommitment
    ) internal view returns (address winner) {
        bytes32 lastAnswer;
        bool isAnswered;
        if (_lastBond == 0) {
            // If the question hasn't been answered, nobody is ever right.
            isAnswered = false;
        } else if (_isCommitment) {
            (uint32 revealTS, bool isRevealed, bytes32 revealedAnswer) = realitio.commitments(_lastAnswerOrCommitmentID);
            if (isRevealed) {
                lastAnswer = revealedAnswer;
                isAnswered = true;
            } else {
                require(revealTS <= uint32(block.timestamp), "Arbitration cannot be done until the last answerer has had time to reveal its commitment.");
                isAnswered = false;
            }
        } else {
            lastAnswer = _lastAnswerOrCommitmentID;
            isAnswered = true;
        }

        // Note that 0-1=type(uint256).max. However starting from Solidity 0.8.x this won't be the case. https://docs.soliditylang.org/en/v0.8.0/080-breaking-changes.html
        return isAnswered && lastAnswer == bytes32(_arbitrationRequest.ruling - 1) ? _lastAnswerer : _arbitrationRequest.requester;
    }
}
