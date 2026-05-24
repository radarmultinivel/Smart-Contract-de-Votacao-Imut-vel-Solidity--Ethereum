// SPDX-License-Identifier: MIT
// Desenvolvido por L. A. Leandro — São José dos Campos, SP — 24/05/2026
pragma solidity ^0.8.20;

contract Voting {
    error Unauthorized();
    error ElectionNotStarted();
    error ElectionEnded();
    error AlreadyVoted();
    error InvalidCandidate();
    error CandidateAlreadyExists();
    error NoCandidatesRegistered();
    error ElectionAlreadyStarted();
    error ElectionAlreadyEnded();
    error TieBetweenCandidates(uint256 candidateId1, uint256 candidateId2);
    error ElectionOngoing();

    struct Candidate {
        uint256 id;
        string name;
        uint256 voteCount;
    }

    address public immutable owner;
    bool public electionActive;

    mapping(address => bool) private hasVoted;
    Candidate[] private candidates;
    mapping(string => bool) private candidateNameExists;
    uint256 private totalVotes;

    modifier onlyOwner() {
        if (msg.sender != owner) revert Unauthorized();
        _;
    }

    modifier duringElection() {
        if (!electionActive) revert ElectionNotStarted();
        _;
    }

    constructor(string[] memory initialCandidates) {
        owner = msg.sender;
        if (initialCandidates.length == 0) revert NoCandidatesRegistered();
        for (uint256 i = 0; i < initialCandidates.length; i++) {
            string memory name = initialCandidates[i];
            if (candidateNameExists[name]) revert CandidateAlreadyExists();
            candidates.push(Candidate({
                id: i,
                name: name,
                voteCount: 0
            }));
            candidateNameExists[name] = true;
        }
    }

    function startElection() external onlyOwner {
        if (electionActive) revert ElectionAlreadyStarted();
        if (candidates.length == 0) revert NoCandidatesRegistered();
        electionActive = true;
    }

    function endElection() external onlyOwner {
        if (!electionActive) revert ElectionAlreadyEnded();
        electionActive = false;
    }

    function addCandidate(string calldata name) external onlyOwner {
        if (electionActive) revert ElectionNotStarted();
        if (candidateNameExists[name]) revert CandidateAlreadyExists();
        candidates.push(Candidate({
            id: candidates.length,
            name: name,
            voteCount: 0
        }));
        candidateNameExists[name] = true;
    }

    function vote(uint256 candidateId) external duringElection {
        if (hasVoted[msg.sender]) revert AlreadyVoted();
        if (candidateId >= candidates.length) revert InvalidCandidate();

        hasVoted[msg.sender] = true;
        candidates[candidateId].voteCount++;
        totalVotes++;
    }

    function getCandidates() external view returns (Candidate[] memory) {
        return candidates;
    }

    function getCandidate(uint256 candidateId) external view returns (Candidate memory) {
        if (candidateId >= candidates.length) revert InvalidCandidate();
        return candidates[candidateId];
    }

    function getTotalVotes() external view returns (uint256) {
        return totalVotes;
    }

    function hasAddressVoted(address voter) external view returns (bool) {
        return hasVoted[voter];
    }

    function getWinner() external view returns (Candidate memory winner) {
        if (candidates.length == 0) revert NoCandidatesRegistered();
        if (electionActive) revert ElectionOngoing();
        if (totalVotes == 0) revert NoCandidatesRegistered();

        uint256 highestVoteCount = 0;
        uint256 winnerId = 0;
        bool tie;

        for (uint256 i = 0; i < candidates.length; i++) {
            if (candidates[i].voteCount > highestVoteCount) {
                highestVoteCount = candidates[i].voteCount;
                winnerId = i;
                tie = false;
            } else if (candidates[i].voteCount == highestVoteCount && candidates[i].voteCount > 0) {
                tie = true;
            }
        }

        if (tie) revert TieBetweenCandidates(winnerId, winnerId + 1);
        return candidates[winnerId];
    }

    function getCandidatesCount() external view returns (uint256) {
        return candidates.length;
    }

    function isElectionActive() external view returns (bool) {
        return electionActive;
    }
}
