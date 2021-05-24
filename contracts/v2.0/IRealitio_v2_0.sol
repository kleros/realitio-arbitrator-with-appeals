// SPDX-License-Identifier: MIT

/**
 *  @authors: [@ferittuncer]
 *  @reviewers: []
 *  @auditors: []
 *  @bounties: []
 *  @deployments: []
 */

import "../IRealitioBase.sol";

pragma solidity ^0.7.6;

/**
 *  @title IRealitio
 *  @dev Required subset of https://github.com/realitio/realitio-contracts/blob/master/truffle/contracts/IRealitio.sol to implement a Realitio v2.0 arbitrator.
 */
interface IRealitio_v2_0 is IRealitioBase {
    /// @notice Submit the answer for a question, for use by the arbitrator.
    /// @dev Doesn't require (or allow) a bond.
    /// If the current final answer is correct, the account should be whoever submitted it.
    /// If the current final answer is wrong, the account should be whoever paid for arbitration.
    /// However, the answerer stipulations are not enforced by the contract.
    /// @param question_id The ID of the question.
    /// @param answer The answer, encoded into bytes32.
    /// @param answerer The account credited with this answer for the purpose of bond claims.
    function submitAnswerByArbitrator(
        bytes32 question_id,
        bytes32 answer,
        address answerer
    ) external;

    /// @notice Returns the history hash of the question. Required before calling submitAnswerByArbitrator to make sure history is correct.
    /// @param question_id The ID of the question.
    /// @dev Updated on each answer, then rewound as each is claimed.
    function getHistoryHash(bytes32 question_id) external view returns (bytes32);

    /// @notice Returns the commitment info by its id. Required before calling submitAnswerByArbitrator to make sure history is correct.
    /// @param commitment_id The ID of the commitment.
    /// @return Time after which the committed answer can be revealed.
    /// @return Whether the commitment has already been revealed or not.
    /// @return The committed answer, encoded as bytes32.
    function commitments(bytes32 commitment_id)
        external
        view
        returns (
            uint32,
            bool,
            bytes32
        );
}
