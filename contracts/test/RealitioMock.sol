pragma solidity >=0.7;

contract RealitioMock {
    address public arbitrator;
    bool public is_pending_arbitration;
    bytes32 public answer;
    bytes32 private history_hash;
    uint256 public bond;
    event MockNotifyOfArbitrationRequest(bytes32 indexed _question_id, address indexed _requester, uint256 _max_previous);
    event MockAnswerSubmitted(bytes32 indexed _question_id, bytes32 answer, address indexed _answerer);

    modifier onlyArbitrator() {
        require(msg.sender == arbitrator, "msg.sender must be arbitrator");
        _;
    }

    function setArbitrator(address _arbitrator) external {
        arbitrator = _arbitrator;
    }

    function notifyOfArbitrationRequest(
        bytes32 _question_id,
        address _requester,
        uint256 _max_previous
    ) external onlyArbitrator {
        is_pending_arbitration = true;
        emit MockNotifyOfArbitrationRequest(_question_id, _requester, _max_previous);
    }

    function assignWinnerAndSubmitAnswerByArbitrator(
        bytes32 _question_id,
        bytes32 _answer,
        address _payee_if_wrong,
        bytes32 _lastHistoryHash,
        bytes32 _lastAnswerOrCommitmentID,
        address _lastAnswerer
    ) external onlyArbitrator {
        _verifyHistoryInputOrRevert(_lastHistoryHash, history_hash, _lastAnswerOrCommitmentID, bond, _lastAnswerer);
        address payee = (_lastAnswerOrCommitmentID == _answer) ? _lastAnswerer : _payee_if_wrong;
        is_pending_arbitration = false;
        history_hash = keccak256(abi.encodePacked(history_hash, _answer, uint256(0), payee, false));
        answer = _answer;
        emit MockAnswerSubmitted(_question_id, _answer, payee);
    }

    // To simulate the answer submission.
    function addAnswerToHistory(
        bytes32 _answer_or_commitment_id,
        address _answerer,
        uint256 _bond,
        bool _is_commitment
    ) external {
        history_hash = keccak256(abi.encodePacked(history_hash, _answer_or_commitment_id, _bond, _answerer, _is_commitment));
        bond = _bond;
    }

    function getHistoryHash(bytes32 _question_id) external view returns (bytes32) {
        return history_hash;
    }

    function toBytes(uint256 _a) external pure returns (bytes32) {
        return bytes32(_a);
    }

    function _verifyHistoryInputOrRevert(
        bytes32 _last_history_hash,
        bytes32 _history_hash,
        bytes32 _answer,
        uint256 _bond,
        address _addr
    ) internal pure returns (bool) {
        if (_history_hash == keccak256(abi.encodePacked(_last_history_hash, _answer, _bond, _addr, true))) {
            return true;
        }
        if (_history_hash == keccak256(abi.encodePacked(_last_history_hash, _answer, _bond, _addr, false))) {
            return false;
        }
        revert("History input provided did not match the expected hash");
    }
}
