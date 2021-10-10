const { ethers, waffle } = require("hardhat");
const { solidity } = waffle;
const { use, expect } = require("chai");
const { soliditySha3 } = require("web3-utils");

use(solidity);

const MAX_UINT256 = ethers.constants.MaxUint256;
const oneETH = ethers.constants.WeiPerEther;
const { hexZeroPad } = ethers.utils;

const arbitratorExtraData = "0x85";
const arbitrationCost = 1000;
const appealCost = 5000;
const questionID = hexZeroPad(0, 32);
const arbitrationID = 0;

const appealTimeOut = 180;
const gasPrice = 8000000;
const MAX_ANSWER = "115792089237316195423570985008687907853269984665640564039457584007913129639935";
const ANSNWERED_TOO_SOON = "0xfffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffe";
const maxPrevious = 2001;

const metaEvidence = "ipfs/X";
const metadata = "ipfs/Y";

const ZERO_HASH = hexZeroPad(0, 32);

let arbitrator;
let realitioProxy;
let realitio;

let governor;
let requester;
let crowdfunder1;
let crowdfunder2;
let answerer;
let other;

describe("Realitio proxy with appeals", () => {
  beforeEach("initialize the contract", async function () {
    [governor, requester, crowdfunder1, crowdfunder2, answerer, other] = await ethers.getSigners();
    ({ arbitrator, realitio, realitioProxy } = await deployContracts(governor));

    // Create disputes so the index in tests will not be a default value.
    await arbitrator.connect(other).createDispute(42, arbitratorExtraData, { value: arbitrationCost });
    await arbitrator.connect(other).createDispute(4, arbitratorExtraData, { value: arbitrationCost });

    await realitio.setArbitrator(realitioProxy.address);
  });

  it("Should correctly set the initial values", async () => {
    expect(await realitioProxy.arbitrator()).to.equal(arbitrator.address);
    expect(await realitioProxy.arbitratorExtraData()).to.equal(arbitratorExtraData);
    expect(await realitioProxy.metadata()).to.equal(metadata);
    expect(await realitioProxy.realitio()).to.equal(realitio.address);

    // 0 - winner, 1 - loser, 2 - loserAppealPeriod, 3 - denominator
    const multipliers = await realitioProxy.getMultipliers();
    expect(multipliers[0]).to.equal(3000);
    expect(multipliers[1]).to.equal(7000);
    expect(multipliers[2]).to.equal(5000);
    expect(multipliers[3]).to.equal(10000);

    expect(await realitioProxy.numberOfRulingOptions(0)).to.equal(MAX_UINT256);
    expect(await realitioProxy.getDisputeFee(questionID)).to.equal(arbitrationCost);
  });

  it("Should set correct values when requesting arbitration and fire the event", async () => {
    await expect(
      realitioProxy.connect(requester).requestArbitration(questionID, maxPrevious, { value: arbitrationCost })
    )
      .to.emit(realitio, "MockNotifyOfArbitrationRequest")
      .withArgs(questionID, await requester.getAddress(), maxPrevious)
      .to.emit(realitioProxy, "Dispute")
      .withArgs(arbitrator.address, 2, 0, 0)
      .to.emit(realitioProxy, "DisputeIDToQuestionID")
      .withArgs(2, questionID);

    const arbitrationRequest = await realitioProxy.arbitrationRequests(arbitrationID);
    expect(arbitrationRequest[0]).to.equal(1, "Incorrect status of the arbitration after creating a request");
    expect(arbitrationRequest[1]).to.equal(await requester.getAddress(), "Incorrect request");
    expect(arbitrationRequest[2]).to.equal(2, "Incorrect dispute ID");
    expect(arbitrationRequest[3]).to.equal(0, "Ruling should not be set");

    const dispute = await arbitrator.disputes(2);
    expect(dispute[0]).to.equal(realitioProxy.address, "Incorrect arbitrable");
    expect(dispute[1].toString()).to.equal(MAX_UINT256.toString(), "Incorrect number of choices");
    expect(dispute[2]).to.equal(arbitrationCost, "Arbitration fee not set up properly");

    expect(await realitioProxy.externalIDtoLocalID(2)).to.equal(arbitrationID, "Incorrect externalIDtoLocalID value");
    expect(await await realitio.is_pending_arbitration()).to.equal(true, "Arbitration flag is not set in Realitio");

    await expect(
      realitioProxy.connect(requester).requestArbitration(questionID, maxPrevious, { value: arbitrationCost })
    ).to.be.revertedWith("Arbitration already requested");
  });

  it("Should correctly fund an appeal and fire the events", async () => {
    let oldBalance;
    let newBalance;
    let txFundAppeal;
    let txFee;
    let tx;

    await expect(
      realitioProxy.connect(crowdfunder1).fundAppeal(arbitrationID, 75, { value: arbitrationCost })
    ).to.be.revertedWith("No dispute to appeal.");

    await realitioProxy.connect(requester).requestArbitration(questionID, maxPrevious, { value: arbitrationCost });

    // Check that can't fund the dispute that is not appealable.
    await expect(
      realitioProxy.connect(crowdfunder1).fundAppeal(arbitrationID, 75, { value: arbitrationCost })
    ).to.be.revertedWith("Funding must be made within the first half appeal period.");
    await expect(
      realitioProxy.connect(crowdfunder1).fundAppeal(arbitrationID, 0, { value: arbitrationCost })
    ).to.be.revertedWith("Funding must be made within the appeal period.");

    await arbitrator.connect(governor).giveAppealableRuling(2, 51231, appealCost, appealTimeOut);

    // loserFee = appealCost + (appealCost * loserMultiplier / 10000) // 5000 + 5000 * 7/10 = 8500
    // 1st Funding ////////////////////////////////////
    oldBalance = await crowdfunder1.getBalance();

    txFundAppeal = realitioProxy.connect(crowdfunder1).fundAppeal(0, 533, { gasPrice: gasPrice, value: appealCost }); // This value doesn't fund fully.
    tx = await txFundAppeal;
    txFee = (await tx.wait()).gasUsed * gasPrice;

    newBalance = await crowdfunder1.getBalance();
    expect(newBalance).to.equal(
      oldBalance.sub(5000).sub(txFee),
      "The crowdfunder has incorrect balance after the first funding"
    );

    await expect(txFundAppeal)
      .to.emit(realitioProxy, "Contribution")
      .withArgs(arbitrationID, 0, 533, await crowdfunder1.getAddress(), 5000); // ArbitrationID, NbRound, Ruling, Sender, Amount

    // 2nd Funding ////////////////////////////////////
    oldBalance = newBalance;
    txFundAppeal = realitioProxy
      .connect(crowdfunder1)
      .fundAppeal(arbitrationID, 533, { gasPrice: gasPrice, value: oneETH }); // Overpay to check that it's handled correctly.
    tx = await txFundAppeal;
    txFee = (await tx.wait()).gasUsed * gasPrice;
    newBalance = await crowdfunder1.getBalance();

    expect(newBalance).to.equal(
      oldBalance.sub(3500).sub(txFee),
      "The crowdfunder has incorrect balance after the second funding"
    );

    await expect(txFundAppeal)
      .to.emit(realitioProxy, "Contribution")
      .withArgs(arbitrationID, 0, 533, await crowdfunder1.getAddress(), 3500) // ArbitrationID, NbRound, Ruling, Sender, Amount
      .to.emit(realitioProxy, "RulingFunded")
      .withArgs(arbitrationID, 0, 533); // ArbitrationID, NbRound, Ruling

    await expect(
      realitioProxy.connect(crowdfunder1).fundAppeal(arbitrationID, 533, { value: appealCost })
    ).to.be.revertedWith("Appeal fee has already been paid.");
  });

  it("Should correctly create and fund subsequent appeal rounds", async () => {
    await realitioProxy.connect(requester).requestArbitration(questionID, maxPrevious, { value: arbitrationCost });
    await arbitrator.connect(governor).giveAppealableRuling(2, 21, appealCost, appealTimeOut);

    await realitioProxy.connect(crowdfunder1).fundAppeal(arbitrationID, 14, { value: 8500 });
    await realitioProxy.connect(crowdfunder2).fundAppeal(arbitrationID, 21, { value: 6500 });

    await arbitrator.connect(governor).giveAppealableRuling(2, 0, appealCost, appealTimeOut);

    await expect(realitioProxy.connect(crowdfunder1).fundAppeal(arbitrationID, 0, { value: oneETH }))
      .to.emit(realitioProxy, "Contribution")
      .withArgs(arbitrationID, 1, 0, await crowdfunder1.getAddress(), 6500); // ArbitrationID, NbRound, Ruling, Sender, Amount
  });

  it("Should not fund the appeal after the timeout", async () => {
    await realitioProxy.connect(requester).requestArbitration(questionID, maxPrevious, { value: arbitrationCost });
    await arbitrator.giveAppealableRuling(2, 21, appealCost, appealTimeOut);

    await ethers.provider.send("evm_increaseTime", [appealTimeOut / 2 + 1]);
    // Loser.
    await expect(
      realitioProxy.connect(crowdfunder1).fundAppeal(arbitrationID, 533, { value: appealCost })
    ).to.be.revertedWith("Funding must be made within the first half appeal period.");

    // Adding another half will cover the whole period.
    await ethers.provider.send("evm_increaseTime", [appealTimeOut / 2 + 1]);

    // Winner.
    await expect(
      realitioProxy.connect(crowdfunder1).fundAppeal(arbitrationID, 21, { value: appealCost })
    ).to.be.revertedWith("Funding must be made within the appeal period.");
  });

  it("Should correctly withdraw appeal fees if a dispute had winner/loser", async () => {
    let oldBalance1;
    let oldBalance2;
    let newBalance;
    let newBalance1;
    let newBalance2;

    const requesterAddress = await requester.getAddress();
    const crowdfunder1Address = await crowdfunder1.getAddress();
    const crowdfunder2Address = await crowdfunder2.getAddress();

    await realitioProxy.connect(requester).requestArbitration(questionID, maxPrevious, { value: arbitrationCost });
    await arbitrator.giveAppealableRuling(2, 5, appealCost, appealTimeOut);

    // LoserFee = 8500, WinnerFee = 6500. AppealCost = 5000.
    // 0 Round.
    await realitioProxy.connect(requester).fundAppeal(arbitrationID, 50, { value: 4000 });
    await realitioProxy.connect(crowdfunder1).fundAppeal(arbitrationID, 50, { value: oneETH });

    await realitioProxy.connect(crowdfunder2).fundAppeal(arbitrationID, 5, { value: 6000 });
    await realitioProxy.connect(crowdfunder1).fundAppeal(arbitrationID, 5, { value: 500 });

    await arbitrator.giveAppealableRuling(2, 5, appealCost, appealTimeOut);

    // 1 Round.
    await realitioProxy.connect(requester).fundAppeal(arbitrationID, 44, { value: 500 });
    await realitioProxy.connect(crowdfunder1).fundAppeal(arbitrationID, 44, { value: 8000 });

    await realitioProxy.connect(crowdfunder2).fundAppeal(arbitrationID, 5, { value: 20000 });

    await arbitrator.giveAppealableRuling(2, 5, appealCost, appealTimeOut);

    // 2 Round.
    // Partially funded side should be reimbursed.
    await realitioProxy.connect(requester).fundAppeal(arbitrationID, 41, { value: 8499 });
    // Winner doesn't have to fund appeal in this case but let's check if it causes unexpected behaviour.
    await realitioProxy.connect(crowdfunder2).fundAppeal(arbitrationID, 5, { value: oneETH });

    await ethers.provider.send("evm_increaseTime", [appealTimeOut + 1]);

    await expect(
      realitioProxy.connect(governor).withdrawFeesAndRewards(arbitrationID, requesterAddress, 0, 50)
    ).to.be.revertedWith("There is no ruling yet.");

    await arbitrator.executeRuling(2);

    const arbitrationRequest = await realitioProxy.arbitrationRequests(arbitrationID);
    expect(arbitrationRequest[0]).to.equal(2, "Status should be Ruled");
    expect(arbitrationRequest[3]).to.equal(5, "Incorrect ruling");

    const oldBalance = await requester.getBalance();
    oldBalance1 = await crowdfunder1.getBalance();
    oldBalance2 = await crowdfunder2.getBalance();

    // Withdraw 0 round.
    await realitioProxy.connect(governor).withdrawFeesAndRewards(arbitrationID, requesterAddress, 0, 50);

    newBalance = await requester.getBalance();
    expect(newBalance).to.equal(oldBalance, "The requester has incorrect balance after withdrawing 0 round");

    await realitioProxy.connect(governor).withdrawFeesAndRewards(arbitrationID, crowdfunder1Address, 0, 50);

    newBalance1 = await crowdfunder1.getBalance();
    expect(newBalance1).to.equal(oldBalance1, "Crowdfunder1 has incorrect balance after withdrawing 0 round");

    await expect(realitioProxy.connect(governor).withdrawFeesAndRewards(arbitrationID, crowdfunder1Address, 0, 5))
      .to.emit(realitioProxy, "Withdrawal")
      .withArgs(arbitrationID, 0, 5, crowdfunder1Address, 769); // ArbitrationID, round, ruling, contributor, amount

    newBalance1 = await crowdfunder1.getBalance();
    expect(newBalance1).to.equal(
      oldBalance1.add(769), // 500 / 6500 * 10000.
      "The balance of the crowdfunder1 is incorrect after withdrawing from winning ruling 0 round"
    );
    oldBalance1 = newBalance1;

    await realitioProxy.connect(governor).withdrawFeesAndRewards(arbitrationID, crowdfunder1Address, 0, 5);
    newBalance1 = await crowdfunder1.getBalance();
    expect(newBalance1).to.equal(
      oldBalance1,
      "The balance of the crowdfunder1 should stay the same after withdrawing the 2nd time"
    );

    await expect(realitioProxy.connect(governor).withdrawFeesAndRewards(arbitrationID, crowdfunder2Address, 0, 5))
      .to.emit(realitioProxy, "Withdrawal")
      .withArgs(arbitrationID, 0, 5, crowdfunder2Address, 9230); // ArbitrationID, round, ruling, contributor, amount

    newBalance2 = await crowdfunder2.getBalance();
    expect(newBalance2).to.equal(
      oldBalance2.add(9230), // 12 / 13 * 10000
      "The balance of the crowdfunder2 is incorrect (withdraw 0 round)"
    );

    oldBalance2 = newBalance2;

    // Withdraw 1 round.
    await realitioProxy.connect(governor).withdrawFeesAndRewards(arbitrationID, requesterAddress, 1, 5);
    await realitioProxy.connect(governor).withdrawFeesAndRewards(arbitrationID, requesterAddress, 1, 44);

    await realitioProxy.connect(governor).withdrawFeesAndRewards(arbitrationID, crowdfunder1Address, 1, 5);
    await realitioProxy.connect(governor).withdrawFeesAndRewards(arbitrationID, crowdfunder1Address, 1, 44);

    await realitioProxy.connect(governor).withdrawFeesAndRewards(arbitrationID, crowdfunder2Address, 1, 5);
    newBalance = await requester.getBalance();
    newBalance1 = await crowdfunder1.getBalance();
    newBalance2 = await crowdfunder2.getBalance();
    expect(newBalance).to.equal(oldBalance, "The balance of the requester should stay the same (withdraw 1 round)");
    expect(newBalance1).to.equal(
      oldBalance1,
      "The balance of the crowdfunder1 should stay the same (withdraw 1 round)"
    );
    expect(newBalance2).to.equal(
      oldBalance2.add(10000), // Full reward.
      "The balance of the crowdfunder2 is incorrect (withdraw 1 round)"
    );
    oldBalance2 = newBalance2;

    // Withdraw 2 round.
    await realitioProxy.connect(governor).withdrawFeesAndRewards(arbitrationID, requesterAddress, 2, 41);
    await realitioProxy.connect(governor).withdrawFeesAndRewards(arbitrationID, crowdfunder2Address, 2, 5);

    newBalance = await requester.getBalance();
    newBalance2 = await crowdfunder2.getBalance();
    expect(newBalance).to.equal(oldBalance.add(8499), "The balance of the requester is incorrect (withdraw 2 round)");
    expect(newBalance2).to.equal(
      oldBalance2.add(6500), // Full winner fee is reimbursed.
      "The balance of the crowdfunder2 is incorrect (withdraw 2 round)"
    );
  });

  it("Should correctly withdraw appeal fees if the winner did not pay the fees in the round", async () => {
    let oldBalance;
    let newBalance;

    await realitioProxy.connect(requester).requestArbitration(questionID, maxPrevious, { value: arbitrationCost });
    await arbitrator.giveAppealableRuling(2, 20, appealCost, appealTimeOut);

    // LoserFee = 8500. AppealCost = 5000.
    await realitioProxy.connect(requester).fundAppeal(arbitrationID, 1, { value: 5000 });
    await realitioProxy.connect(crowdfunder1).fundAppeal(arbitrationID, 1, { value: 3500 });

    await realitioProxy.connect(crowdfunder2).fundAppeal(arbitrationID, 4, { value: 1000 });
    await realitioProxy.connect(crowdfunder1).fundAppeal(arbitrationID, 4, { value: 10000 });

    await arbitrator.giveAppealableRuling(2, 20, appealCost, appealTimeOut);
    await ethers.provider.send("evm_increaseTime", [appealTimeOut + 1]);

    await arbitrator.executeRuling(2);

    oldBalance = await requester.getBalance();
    await realitioProxy.connect(governor).withdrawFeesAndRewards(arbitrationID, await requester.getAddress(), 0, 1);
    newBalance = await requester.getBalance();
    expect(newBalance).to.equal(
      oldBalance.add(3529), // 5000 * 12000 / 17000.
      "The balance of the requester is incorrect"
    );

    oldBalance = await crowdfunder1.getBalance();
    await realitioProxy.connect(governor).withdrawFeesAndRewards(arbitrationID, await crowdfunder1.getAddress(), 0, 1);
    newBalance = await crowdfunder1.getBalance();
    expect(newBalance).to.equal(
      oldBalance.add(2470), // 3500 * 12000 / 17000.
      "The balance of the crowdfunder1 is incorrect (1 ruling)"
    );
    oldBalance = newBalance;

    await realitioProxy.connect(governor).withdrawFeesAndRewards(arbitrationID, await crowdfunder1.getAddress(), 0, 4);
    newBalance = await crowdfunder1.getBalance();
    expect(newBalance).to.equal(
      oldBalance.add(5294), // 7500 * 12000 / 17000.
      "The balance of the crowdfunder1 is incorrect (4 ruling)"
    );

    oldBalance = await crowdfunder2.getBalance();
    await realitioProxy.connect(governor).withdrawFeesAndRewards(arbitrationID, await crowdfunder2.getAddress(), 0, 4);
    newBalance = await crowdfunder2.getBalance();
    expect(newBalance).to.equal(
      oldBalance.add(705), // 1000 * 12000 / 17000.
      "The balance of the crowdfunder1 is incorrect"
    );
  });

  it("Should correctly withdraw appeal fees for multiple rounds", async () => {
    let oldBalance;
    let newBalance;

    await realitioProxy.connect(requester).requestArbitration(questionID, maxPrevious, { value: arbitrationCost });
    await arbitrator.giveAppealableRuling(2, 3, appealCost, appealTimeOut);

    // LoserFee = 8500. AppealCost = 5000.
    // WinnerFee = 6500.
    await realitioProxy.connect(requester).fundAppeal(arbitrationID, 1, { value: 8500 });
    await realitioProxy.connect(crowdfunder1).fundAppeal(arbitrationID, 3, { value: 10000 });

    // 2 answer is the winner.
    await arbitrator.giveAppealableRuling(2, 3, appealCost, appealTimeOut);

    await realitioProxy.connect(requester).fundAppeal(arbitrationID, 1, { value: 17 });
    await realitioProxy.connect(crowdfunder1).fundAppeal(arbitrationID, 3, { value: 22 });

    await ethers.provider.send("evm_increaseTime", [appealTimeOut + 1]);
    await arbitrator.executeRuling(2);

    oldBalance = await requester.getBalance();

    await realitioProxy
      .connect(governor)
      .withdrawFeesAndRewardsForAllRounds(arbitrationID, await requester.getAddress(), 1);

    newBalance = await requester.getBalance();
    expect(newBalance).to.equal(oldBalance.add(17), "The balance of the requester is incorrect");

    oldBalance = await crowdfunder1.getBalance();
    await realitioProxy
      .connect(governor)
      .withdrawFeesAndRewardsForAllRounds(arbitrationID, await crowdfunder1.getAddress(), 3);
    newBalance = await crowdfunder1.getBalance();
    expect(newBalance).to.equal(oldBalance.add(10022), "The balance of the crowdfunder1 is incorrect");
  });

  it("Should store correct ruling when dispute had winner/loser", async () => {
    await realitioProxy.connect(requester).requestArbitration(questionID, maxPrevious, { value: arbitrationCost });
    await expect(realitioProxy.connect(requester).rule(2, 15)).to.be.revertedWith("Only arbitrator allowed");

    await arbitrator.connect(governor).giveRuling(2, 15);

    const arbitrationRequest = await realitioProxy.arbitrationRequests(arbitrationID);
    expect(arbitrationRequest[0]).to.equal(2, "The status should be Ruled");
    expect(arbitrationRequest[3]).to.equal(15, "Stored answer is incorrect");
  });

  it("Should store 0 ruling correctly", async () => {
    await realitioProxy.connect(requester).requestArbitration(questionID, maxPrevious, { value: arbitrationCost });
    await arbitrator.connect(governor).giveRuling(2, 0);
    const arbitrationRequest = await realitioProxy.arbitrationRequests(arbitrationID);
    expect(arbitrationRequest[0]).to.equal(2, "The status should be Ruled");
    expect(arbitrationRequest[3]).to.equal(0, "Stored answer should be 0");
  });

  it("Should store max answer correctly", async () => {
    await realitioProxy.connect(requester).requestArbitration(questionID, maxPrevious, { value: arbitrationCost });
    await arbitrator.connect(governor).giveRuling(2, MAX_UINT256);
    const arbitrationRequest = await realitioProxy.arbitrationRequests(arbitrationID);
    expect(arbitrationRequest[0]).to.equal(2, "The status should be Ruled");
    expect(arbitrationRequest[3].toString()).to.equal(MAX_ANSWER, "Stored answer should be max number");
  });

  it("Should switch the ruling if the loser paid appeal fees while winner did not", async () => {
    await realitioProxy.connect(requester).requestArbitration(questionID, maxPrevious, { value: arbitrationCost });
    await arbitrator.giveAppealableRuling(2, 14, appealCost, appealTimeOut);

    await realitioProxy.connect(crowdfunder1).fundAppeal(arbitrationID, 50, { value: oneETH });
    await ethers.provider.send("evm_increaseTime", [appealTimeOut + 1]);
    await arbitrator.executeRuling(2);

    const arbitrationRequest = await realitioProxy.arbitrationRequests(arbitrationID);
    expect(arbitrationRequest[0]).to.equal(2, "The status should be Ruled");
    expect(arbitrationRequest[3]).to.equal(50, "Answer should be 50");
  });

  it("Should set correct values when answer is reported to Realitio", async () => {
    await realitioProxy.connect(requester).requestArbitration(questionID, maxPrevious, { value: arbitrationCost });
    const realitioAnswer = await realitio.toBytes(22);
    const answererAddress = await answerer.getAddress();
    const badAnswer = await realitio.toBytes(23);
    const lastHistoryHash = ZERO_HASH;
    await realitio.addAnswerToHistory(realitioAnswer, await answerer.getAddress(), 2000, false);

    const currentHash = soliditySha3(lastHistoryHash, realitioAnswer, 2000, answererAddress, false);

    await expect(
      realitioProxy.connect(governor).reportAnswer(questionID, lastHistoryHash, realitioAnswer, answererAddress)
    ).to.be.revertedWith("The status should be Ruled.");

    await arbitrator.giveAppealableRuling(2, 23, appealCost, appealTimeOut); // Arbitrator's ruling matches the answer in this case.
    await realitioProxy.connect(crowdfunder1).fundAppeal(arbitrationID, 81, { value: 500 });
    await ethers.provider.send("evm_increaseTime", [appealTimeOut + 1]);
    await arbitrator.executeRuling(2);

    // Check incorrect inputs.
    await expect(
      realitioProxy.connect(governor).reportAnswer(questionID, currentHash, realitioAnswer, answererAddress)
    ).to.be.revertedWith("History input provided did not match the expected hash");
    await expect(
      realitioProxy.connect(governor).reportAnswer(questionID, lastHistoryHash, badAnswer, answererAddress)
    ).to.be.revertedWith("History input provided did not match the expected hash");

    await expect(
      realitioProxy.connect(governor).reportAnswer(questionID, lastHistoryHash, badAnswer, await governor.getAddress())
    ).to.be.revertedWith("History input provided did not match the expected hash");
    //

    await expect(
      realitioProxy.connect(governor).reportAnswer(questionID, lastHistoryHash, realitioAnswer, answererAddress)
    )
      .to.emit(realitio, "MockAnswerSubmitted")
      .withArgs(questionID, realitioAnswer, await answerer.getAddress());

    const arbitrationRequest = await realitioProxy.arbitrationRequests(arbitrationID);
    expect(arbitrationRequest[0]).to.equal(3, "The status should be Reported");

    // Check that can't report 2nd time.
    await expect(
      realitioProxy
        .connect(governor)
        .reportAnswer(questionID, lastHistoryHash, realitioAnswer, await governor.getAddress())
    ).to.be.revertedWith("The status should be Ruled.");

    // Check that withdrawal works with the updated status.
    const oldBalance = await crowdfunder1.getBalance();
    await realitioProxy.connect(governor).withdrawFeesAndRewards(arbitrationID, await crowdfunder1.getAddress(), 0, 81);
    newBalance = await crowdfunder1.getBalance();
    expect(newBalance).to.equal(oldBalance.add(500), "Withdrawal did not work with Reported status");

    // Check Realitio data.
    expect(await realitio.is_pending_arbitration()).to.equal(false, "Arbitration flag should not be set");

    const newHash = soliditySha3(currentHash, realitioAnswer, 0, answererAddress, false);
    expect(await realitio.getHistoryHash(questionID)).to.equal(newHash, "Realitio hash is incorrect after arbitration");
    expect(await realitio.answer()).to.equal(
      await realitio.toBytes(arbitrationRequest[3].toNumber() - 1),
      "Answer reported incorrectly"
    );
  });

  it("Should correctly report ANSWERED_TOO_SOON", async () => {
    await realitioProxy.connect(requester).requestArbitration(questionID, maxPrevious, { value: arbitrationCost });
    const realitioAnswer = await realitio.toBytes(22);
    const answererAddress = await answerer.getAddress();
    const lastHistoryHash = ZERO_HASH;
    await realitio.addAnswerToHistory(realitioAnswer, await answerer.getAddress(), 2000, false);

    await arbitrator.giveAppealableRuling(2, MAX_UINT256, appealCost, appealTimeOut); // The answer doesn't match the ruling
    await ethers.provider.send("evm_increaseTime", [appealTimeOut + 1]);
    await arbitrator.executeRuling(2);

    await realitioProxy.connect(governor).reportAnswer(questionID, lastHistoryHash, realitioAnswer, answererAddress);

    const arbitrationRequest = await realitioProxy.arbitrationRequests(arbitrationID);
    expect(arbitrationRequest[0]).to.equal(3, "The status should be Reported");
    expect(arbitrationRequest[3]).to.equal(MAX_UINT256, "The ruling is stored incorrectly");

    expect((await realitio.answer()).toString()).to.equal(ANSNWERED_TOO_SOON, "Answer reported incorrectly");
  });

  it("Should submit evidence and fire the event", async () => {
    await expect(realitioProxy.connect(other).submitEvidence(arbitrationID, "EvidenceURI"))
      .to.emit(realitioProxy, "Evidence")
      .withArgs(arbitrator.address, arbitrationID, await other.getAddress(), "EvidenceURI");
  });

  async function deployContracts(signer) {
    const Arbitrator = await ethers.getContractFactory("AutoAppealableArbitrator", signer);
    const arbitrator = await Arbitrator.deploy(String(arbitrationCost));

    const Realitio = await ethers.getContractFactory("RealitioMock", signer);
    const realitio = await Realitio.deploy();

    const RealitioProxy = await ethers.getContractFactory("Realitio_v2_1_ArbitratorWithAppeals", signer);
    const realitioProxy = await RealitioProxy.deploy(
      realitio.address,
      metadata,
      arbitrator.address,
      arbitratorExtraData,
      metaEvidence
    );

    return {
      arbitrator,
      realitio,
      realitioProxy,
    };
  }
});
