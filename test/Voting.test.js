// Desenvolvido por L. A. Leandro — São José dos Campos, SP — 24/05/2026
const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Voting", function () {
  let voting;
  let owner, voter1, voter2, voter3, voter4;

  const candidates = ["Alice", "Bob", "Charlie"];

  beforeEach(async function () {
    [owner, voter1, voter2, voter3, voter4] = await ethers.getSigners();
    const Voting = await ethers.getContractFactory("Voting");
    voting = await Voting.deploy(candidates);
    await voting.waitForDeployment();
  });

  describe("Deployment", function () {
    it("should set the owner correctly", async function () {
      expect(await voting.owner()).to.equal(owner.address);
    });

    it("should register initial candidates", async function () {
      const count = await voting.getCandidatesCount();
      expect(count).to.equal(3);
    });

    it("should revert if no candidates provided", async function () {
      const Voting = await ethers.getContractFactory("Voting");
      await expect(Voting.deploy([])).to.be.revertedWithCustomError(
        Voting,
        "NoCandidatesRegistered"
      );
    });

    it("should revert on duplicate candidate names", async function () {
      const Voting = await ethers.getContractFactory("Voting");
      await expect(
        Voting.deploy(["Alice", "Alice"])
      ).to.be.revertedWithCustomError(Voting, "CandidateAlreadyExists");
    });

    it("should not be active by default", async function () {
      expect(await voting.isElectionActive()).to.equal(false);
    });
  });

  describe("Election Lifecycle", function () {
    it("should start election when owner calls startElection", async function () {
      await voting.startElection();
      expect(await voting.isElectionActive()).to.equal(true);
    });

    it("should revert startElection if already active", async function () {
      await voting.startElection();
      await expect(
        voting.startElection()
      ).to.be.revertedWithCustomError(voting, "ElectionAlreadyStarted");
    });

    it("should end election when owner calls endElection", async function () {
      await voting.startElection();
      await voting.endElection();
      expect(await voting.isElectionActive()).to.equal(false);
    });

    it("should revert endElection if not active", async function () {
      await expect(
        voting.endElection()
      ).to.be.revertedWithCustomError(voting, "ElectionAlreadyEnded");
    });

    it("should revert endElection called twice", async function () {
      await voting.startElection();
      await voting.endElection();
      await expect(
        voting.endElection()
      ).to.be.revertedWithCustomError(voting, "ElectionAlreadyEnded");
    });
  });

  describe("Candidate Management", function () {
    it("should allow owner to add candidates before election", async function () {
      await voting.addCandidate("Dave");
      const count = await voting.getCandidatesCount();
      expect(count).to.equal(4);
    });

    it("should revert addCandidate if election is active", async function () {
      await voting.startElection();
      await expect(
        voting.addCandidate("Dave")
      ).to.be.revertedWithCustomError(voting, "ElectionNotStarted");
    });

    it("should revert addCandidate if name already exists", async function () {
      await expect(
        voting.addCandidate("Alice")
      ).to.be.revertedWithCustomError(voting, "CandidateAlreadyExists");
    });

    it("should revert addCandidate from non-owner", async function () {
      await expect(
        voting.connect(voter1).addCandidate("Dave")
      ).to.be.revertedWithCustomError(voting, "Unauthorized");
    });

    it("should revert getCandidate with invalid id", async function () {
      await expect(
        voting.getCandidate(99)
      ).to.be.revertedWithCustomError(voting, "InvalidCandidate");
    });
  });

  describe("Voting", function () {
    beforeEach(async function () {
      await voting.startElection();
    });

    it("should allow a voter to vote for a candidate", async function () {
      await voting.connect(voter1).vote(0);
      const candidate = await voting.getCandidate(0);
      expect(candidate.voteCount).to.equal(1);
    });

    it("should increment totalVotes after voting", async function () {
      await voting.connect(voter1).vote(0);
      await voting.connect(voter2).vote(1);
      expect(await voting.getTotalVotes()).to.equal(2);
    });

    it("should revert voting twice with same account", async function () {
      await voting.connect(voter1).vote(0);
      await expect(
        voting.connect(voter1).vote(1)
      ).to.be.revertedWithCustomError(voting, "AlreadyVoted");
    });

    it("should revert voting for invalid candidate ID", async function () {
      await expect(
        voting.connect(voter1).vote(99)
      ).to.be.revertedWithCustomError(voting, "InvalidCandidate");
    });

    it("should revert voting before election starts", async function () {
      const Voting2 = await ethers.getContractFactory("Voting");
      const v2 = await Voting2.deploy(candidates);
      await v2.waitForDeployment();
      await expect(
        v2.connect(voter1).vote(0)
      ).to.be.revertedWithCustomError(v2, "ElectionNotStarted");
    });

    it("should mark that an address has voted", async function () {
      await voting.connect(voter1).vote(0);
      expect(await voting.hasAddressVoted(voter1.address)).to.equal(true);
      expect(await voting.hasAddressVoted(voter2.address)).to.equal(false);
    });

    it("should track votes per candidate correctly", async function () {
      await voting.connect(voter1).vote(0);
      await voting.connect(voter2).vote(0);
      await voting.connect(voter3).vote(1);
      await voting.connect(voter4).vote(2);

      const alice = await voting.getCandidate(0);
      const bob = await voting.getCandidate(1);
      const charlie = await voting.getCandidate(2);

      expect(alice.voteCount).to.equal(2);
      expect(bob.voteCount).to.equal(1);
      expect(charlie.voteCount).to.equal(1);
    });
  });

  describe("Winner Selection", function () {
    it("should return the candidate with most votes", async function () {
      await voting.startElection();
      await voting.connect(voter1).vote(0);
      await voting.connect(voter2).vote(0);
      await voting.connect(voter3).vote(1);
      await voting.endElection();

      const winner = await voting.getWinner();
      expect(winner.name).to.equal("Alice");
      expect(winner.voteCount).to.equal(2);
    });

    it("should revert getWinner if election is ongoing", async function () {
      await voting.startElection();
      await voting.connect(voter1).vote(0);
      await expect(voting.getWinner()).to.be.revertedWithCustomError(
        voting,
        "ElectionOngoing"
      );
    });

    it("should revert getWinner if there is a tie", async function () {
      await voting.startElection();
      await voting.connect(voter1).vote(0);
      await voting.connect(voter2).vote(1);
      await voting.endElection();

      await expect(
        voting.getWinner()
      ).to.be.revertedWithCustomError(voting, "TieBetweenCandidates");
    });

    it("should revert getWinner with no votes", async function () {
      await voting.startElection();
      await voting.endElection();
      await expect(
        voting.getWinner()
      ).to.be.revertedWithCustomError(voting, "NoCandidatesRegistered");
    });
  });

  describe("Access Control", function () {
    it("should revert non-owner startElection", async function () {
      await expect(
        voting.connect(voter1).startElection()
      ).to.be.revertedWithCustomError(voting, "Unauthorized");
    });

    it("should revert non-owner endElection", async function () {
      await voting.startElection();
      await expect(
        voting.connect(voter1).endElection()
      ).to.be.revertedWithCustomError(voting, "Unauthorized");
    });
  });
});
