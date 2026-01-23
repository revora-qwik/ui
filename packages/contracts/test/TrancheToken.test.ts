import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { network } from "hardhat";
import { parseUnits } from "viem";

describe("TrancheToken", async function () {
  const { viem } = await network.connect();
  const publicClient = await viem.getPublicClient();
  const [owner, treasury, investor1, investor2] = await viem.getWalletClients();

  async function deployFixture() {
    // Deploy mock USDC (6 decimals)
    const mockUSDC = await viem.deployContract("MockERC20", [
      "USD Coin",
      "USDC",
      6
    ]);

    // Deploy TrancheToken
    const tranche = await viem.deployContract("TrancheToken", [
      "Chicken Farm Tranche",
      "CHKN-T1",
      "Investment in chicken farm expansion",
      parseUnits("100000", 6), // 100k USDC funding goal
      parseUnits("1", 6), // 1 USDC per token
      mockUSDC.address,
      6,
      treasury.account.address,
      owner.account.address
    ]);

    // Mint USDC to investors
    await mockUSDC.write.mint([investor1.account.address, parseUnits("50000", 6)]);
    await mockUSDC.write.mint([investor2.account.address, parseUnits("60000", 6)]);

    return { tranche, mockUSDC };
  }

  it("Should set correct token metadata", async function () {
    const { tranche } = await deployFixture();

    assert.equal(await tranche.read.name(), "Chicken Farm Tranche");
    assert.equal(await tranche.read.symbol(), "CHKN-T1");
    assert.equal(await tranche.read.projectDescription(), "Investment in chicken farm expansion");
  });

  it("Should set correct funding parameters", async function () {
    const { tranche } = await deployFixture();

    assert.equal(await tranche.read.fundingGoal(), parseUnits("100000", 6));
    assert.equal(await tranche.read.pricePerToken(), parseUnits("1", 6));
    assert.equal(await tranche.read.fundingActive(), true);
    assert.equal(await tranche.read.fundingComplete(), false);
  });

  it("Should allow users to invest", async function () {
    const { tranche, mockUSDC } = await deployFixture();

    const investAmount = parseUnits("10000", 6);

    // Approve tranche to spend USDC
    await mockUSDC.write.approve([tranche.address, investAmount], {
      account: investor1.account
    });

    // Invest
    await tranche.write.invest([investAmount], {
      account: investor1.account
    });

    // Check balances
    const expectedTokens = parseUnits("10000", 18); // 10k tokens
    assert.equal(await tranche.read.balanceOf([investor1.account.address]), expectedTokens);
    assert.equal(await tranche.read.totalRaised(), investAmount);
    assert.equal(await mockUSDC.read.balanceOf([treasury.account.address]), investAmount);
  });

  it("Should complete funding when goal reached", async function () {
    const { tranche, mockUSDC } = await deployFixture();

    // Investor 1: 50k
    const invest1 = parseUnits("50000", 6);
    await mockUSDC.write.approve([tranche.address, invest1], {
      account: investor1.account
    });
    await tranche.write.invest([invest1], {
      account: investor1.account
    });

    assert.equal(await tranche.read.fundingComplete(), false);

    // Investor 2: 50k (reaches goal)
    const invest2 = parseUnits("50000", 6);
    await mockUSDC.write.approve([tranche.address, invest2], {
      account: investor2.account
    });
    await tranche.write.invest([invest2], {
      account: investor2.account
    });

    assert.equal(await tranche.read.fundingComplete(), true);
    assert.equal(await tranche.read.fundingActive(), false);
  });

  it("Should allow owner to pause/activate funding", async function () {
    const { tranche } = await deployFixture();

    await tranche.write.pauseFunding({ account: owner.account });
    assert.equal(await tranche.read.fundingActive(), false);

    await tranche.write.activateFunding({ account: owner.account });
    assert.equal(await tranche.read.fundingActive(), true);
  });

  it("Should allow delegation for voting", async function () {
    const { tranche, mockUSDC } = await deployFixture();

    // Invest
    const investAmount = parseUnits("10000", 6);
    await mockUSDC.write.approve([tranche.address, investAmount], {
      account: investor1.account
    });
    await tranche.write.invest([investAmount], {
      account: investor1.account
    });

    // Delegate to self to activate voting power
    await tranche.write.delegate([investor1.account.address], {
      account: investor1.account
    });

    const expectedVotes = parseUnits("10000", 18);
    assert.equal(await tranche.read.getVotes([investor1.account.address]), expectedVotes);
  });

  it("Should have immutable treasury address", async function () {
    const { tranche } = await deployFixture();

    // Verify treasury is set correctly at deployment
    assert.equal(
      (await tranche.read.treasury()).toLowerCase(),
      treasury.account.address.toLowerCase()
    );

    // Treasury should remain immutable - setTreasury function removed from contract
    // If wrong treasury is set, deploy a new tranche instead
  });

  it("Should cap investment at remaining goal amount", async function () {
    const { tranche, mockUSDC } = await deployFixture();

    // Goal is 100,000 USDC
    const fundingGoal = parseUnits("100000", 6);

    // First investment: investor1 invests all 50,000 USDC
    const invest1 = parseUnits("50000", 6);
    await mockUSDC.write.approve([tranche.address, invest1], {
      account: investor1.account
    });
    await tranche.write.invest([invest1], {
      account: investor1.account
    });

    // Second investment: investor2 invests 49,000 USDC (leaving only 1,000 remaining)
    const invest2 = parseUnits("49000", 6);
    await mockUSDC.write.approve([tranche.address, invest2], {
      account: investor2.account
    });
    await tranche.write.invest([invest2], {
      account: investor2.account
    });

    // At this point: totalRaised = 99,000 USDC, remaining = 1,000 USDC

    // Check balances before final investment
    const treasuryBalanceBefore = await mockUSDC.read.balanceOf([treasury.account.address]);
    const investor2BalanceBefore = await mockUSDC.read.balanceOf([investor2.account.address]);

    // Final investment: investor2 tries to invest 10,000 USDC (but only 1,000 should be accepted)
    const attemptedInvest = parseUnits("10000", 6);
    const expectedInvest = parseUnits("1000", 6); // Only 1,000 remaining to goal

    await mockUSDC.write.approve([tranche.address, attemptedInvest], {
      account: investor2.account
    });
    await tranche.write.invest([attemptedInvest], {
      account: investor2.account
    });

    // Verify totalRaised equals exactly the funding goal
    const totalRaised = await tranche.read.totalRaised();
    assert.equal(totalRaised, fundingGoal);

    // Verify funding is complete
    assert.equal(await tranche.read.fundingComplete(), true);

    // Verify only 1,000 USDC was transferred from investor2 in final transaction
    const investor2BalanceAfter = await mockUSDC.read.balanceOf([investor2.account.address]);
    const actualTransferred = investor2BalanceBefore - investor2BalanceAfter;
    assert.equal(actualTransferred, expectedInvest);

    // Verify treasury received exactly 1,000 USDC from final transaction
    const treasuryBalanceAfter = await mockUSDC.read.balanceOf([treasury.account.address]);
    const treasuryReceived = treasuryBalanceAfter - treasuryBalanceBefore;
    assert.equal(treasuryReceived, expectedInvest);

    // Verify investor2 received the correct total tokens (49,000 + 1,000 = 50,000)
    const expectedTokens = parseUnits("50000", 18); // 50,000 USDC = 50,000 tokens
    const investor2Tokens = await tranche.read.balanceOf([investor2.account.address]);
    assert.equal(investor2Tokens, expectedTokens);
  });

  describe("Tranche Closure", async function () {
    describe("Closure State Tests", async function () {
      it("Should allow owner to mark as successful after funding complete", async function () {
        const { tranche, mockUSDC } = await deployFixture();

        // Complete funding first - use both investors to reach 100k
        const invest1 = parseUnits("50000", 6);
        await mockUSDC.write.approve([tranche.address, invest1], {
          account: investor1.account
        });
        await tranche.write.invest([invest1], {
          account: investor1.account
        });

        const invest2 = parseUnits("50000", 6);
        await mockUSDC.write.approve([tranche.address, invest2], {
          account: investor2.account
        });
        await tranche.write.invest([invest2], {
          account: investor2.account
        });

        assert.equal(await tranche.read.fundingComplete(), true);

        // Mark as successful
        await tranche.write.markAsSuccessful({ account: owner.account });

        // Verify status
        const status = await tranche.read.trancheStatus();
        assert.equal(status, 1); // ClosedSuccess = 1
      });

      it("Should not allow marking as successful before funding complete", async function () {
        const { tranche } = await deployFixture();

        await assert.rejects(
          tranche.write.markAsSuccessful({ account: owner.account }),
          /Funding not complete/
        );
      });

      it("Should allow owner to mark as cancelled", async function () {
        const { tranche } = await deployFixture();

        await tranche.write.markAsCancelled({ account: owner.account });

        const status = await tranche.read.trancheStatus();
        assert.equal(status, 2); // ClosedCancelled = 2
        assert.equal(await tranche.read.fundingActive(), false);
      });

      it("Should capture snapshot supply when marking as cancelled", async function () {
        const { tranche, mockUSDC } = await deployFixture();

        // Invest first
        const investAmount = parseUnits("50000", 6);
        await mockUSDC.write.approve([tranche.address, investAmount], {
          account: investor1.account
        });
        await tranche.write.invest([investAmount], {
          account: investor1.account
        });

        const expectedSupply = parseUnits("50000", 18);
        const supplyBefore = await tranche.read.totalSupply();
        assert.equal(supplyBefore, expectedSupply);

        // Mark as cancelled
        await tranche.write.markAsCancelled({ account: owner.account });

        const snapshotSupply = await tranche.read.refundSnapshotSupply();
        assert.equal(snapshotSupply, expectedSupply);
      });

      it("Should not allow marking success after cancellation", async function () {
        const { tranche } = await deployFixture();

        await tranche.write.markAsCancelled({ account: owner.account });

        await assert.rejects(
          tranche.write.markAsSuccessful({ account: owner.account }),
          /Tranche already closed/
        );
      });

      it("Should not allow marking cancelled after success", async function () {
        const { tranche, mockUSDC } = await deployFixture();

        // Complete funding and mark successful - use both investors
        const invest1 = parseUnits("50000", 6);
        await mockUSDC.write.approve([tranche.address, invest1], {
          account: investor1.account
        });
        await tranche.write.invest([invest1], {
          account: investor1.account
        });

        const invest2 = parseUnits("50000", 6);
        await mockUSDC.write.approve([tranche.address, invest2], {
          account: investor2.account
        });
        await tranche.write.invest([invest2], {
          account: investor2.account
        });

        await tranche.write.markAsSuccessful({ account: owner.account });

        await assert.rejects(
          tranche.write.markAsCancelled({ account: owner.account }),
          /Tranche already closed/
        );
      });

      it("Should not allow non-owner to mark as closed", async function () {
        const { tranche } = await deployFixture();

        await assert.rejects(
          tranche.write.markAsSuccessful({ account: investor1.account })
        );

        await assert.rejects(
          tranche.write.markAsCancelled({ account: investor1.account })
        );
      });
    });

    describe("Refund Mechanics Tests", async function () {
      it("Should allow owner to deposit refund funds", async function () {
        const { tranche, mockUSDC } = await deployFixture();

        // Mark as cancelled
        await tranche.write.markAsCancelled({ account: owner.account });

        // Mint USDC to owner for refund
        const refundAmount = parseUnits("50000", 6);
        await mockUSDC.write.mint([owner.account.address, refundAmount]);

        // Approve and deposit
        await mockUSDC.write.approve([tranche.address, refundAmount], {
          account: owner.account
        });
        await tranche.write.depositRefundFunds([refundAmount], {
          account: owner.account
        });

        assert.equal(await tranche.read.refundPool(), refundAmount);
      });

      it("Should allow multiple refund deposits", async function () {
        const { tranche, mockUSDC } = await deployFixture();

        await tranche.write.markAsCancelled({ account: owner.account });

        // First deposit
        const refund1 = parseUnits("30000", 6);
        await mockUSDC.write.mint([owner.account.address, refund1]);
        await mockUSDC.write.approve([tranche.address, refund1], {
          account: owner.account
        });
        await tranche.write.depositRefundFunds([refund1], {
          account: owner.account
        });

        // Second deposit
        const refund2 = parseUnits("20000", 6);
        await mockUSDC.write.mint([owner.account.address, refund2]);
        await mockUSDC.write.approve([tranche.address, refund2], {
          account: owner.account
        });
        await tranche.write.depositRefundFunds([refund2], {
          account: owner.account
        });

        const totalRefund = parseUnits("50000", 6);
        assert.equal(await tranche.read.refundPool(), totalRefund);
      });

      it("Should not allow deposit if not cancelled", async function () {
        const { tranche, mockUSDC } = await deployFixture();

        const refundAmount = parseUnits("50000", 6);
        await mockUSDC.write.mint([owner.account.address, refundAmount]);
        await mockUSDC.write.approve([tranche.address, refundAmount], {
          account: owner.account
        });

        await assert.rejects(
          tranche.write.depositRefundFunds([refundAmount], {
            account: owner.account
          }),
          /Tranche not cancelled/
        );
      });

      it("Should allow users to claim proportional refunds", async function () {
        const { tranche, mockUSDC } = await deployFixture();

        // Invest
        const investAmount = parseUnits("50000", 6);
        await mockUSDC.write.approve([tranche.address, investAmount], {
          account: investor1.account
        });
        await tranche.write.invest([investAmount], {
          account: investor1.account
        });

        // Cancel and deposit full refund
        await tranche.write.markAsCancelled({ account: owner.account });
        await mockUSDC.write.mint([owner.account.address, investAmount]);
        await mockUSDC.write.approve([tranche.address, investAmount], {
          account: owner.account
        });
        await tranche.write.depositRefundFunds([investAmount], {
          account: owner.account
        });

        // Claim refund
        const balanceBefore = await mockUSDC.read.balanceOf([
          investor1.account.address
        ]);
        await tranche.write.claimRefund({ account: investor1.account });
        const balanceAfter = await mockUSDC.read.balanceOf([
          investor1.account.address
        ]);

        assert.equal(balanceAfter - balanceBefore, investAmount);
      });

      it("Should burn tokens on refund claim", async function () {
        const { tranche, mockUSDC } = await deployFixture();

        // Invest
        const investAmount = parseUnits("50000", 6);
        await mockUSDC.write.approve([tranche.address, investAmount], {
          account: investor1.account
        });
        await tranche.write.invest([investAmount], {
          account: investor1.account
        });

        const tokensBefore = await tranche.read.balanceOf([
          investor1.account.address
        ]);
        assert.equal(tokensBefore, parseUnits("50000", 18));

        // Cancel and refund
        await tranche.write.markAsCancelled({ account: owner.account });
        await mockUSDC.write.mint([owner.account.address, investAmount]);
        await mockUSDC.write.approve([tranche.address, investAmount], {
          account: owner.account
        });
        await tranche.write.depositRefundFunds([investAmount], {
          account: owner.account
        });

        await tranche.write.claimRefund({ account: investor1.account });

        const tokensAfter = await tranche.read.balanceOf([
          investor1.account.address
        ]);
        assert.equal(tokensAfter, 0n);
      });

      it("Should not allow double-claiming refunds", async function () {
        const { tranche, mockUSDC } = await deployFixture();

        // Invest
        const investAmount = parseUnits("50000", 6);
        await mockUSDC.write.approve([tranche.address, investAmount], {
          account: investor1.account
        });
        await tranche.write.invest([investAmount], {
          account: investor1.account
        });

        // Cancel and refund
        await tranche.write.markAsCancelled({ account: owner.account });
        await mockUSDC.write.mint([owner.account.address, investAmount]);
        await mockUSDC.write.approve([tranche.address, investAmount], {
          account: owner.account
        });
        await tranche.write.depositRefundFunds([investAmount], {
          account: owner.account
        });

        await tranche.write.claimRefund({ account: investor1.account });

        await assert.rejects(
          tranche.write.claimRefund({ account: investor1.account }),
          /Already claimed/
        );
      });

      it("Should calculate refunds correctly with partial pool", async function () {
        const { tranche, mockUSDC } = await deployFixture();

        // Two investors
        const invest1 = parseUnits("30000", 6);
        const invest2 = parseUnits("20000", 6);

        await mockUSDC.write.approve([tranche.address, invest1], {
          account: investor1.account
        });
        await tranche.write.invest([invest1], {
          account: investor1.account
        });

        await mockUSDC.write.approve([tranche.address, invest2], {
          account: investor2.account
        });
        await tranche.write.invest([invest2], {
          account: investor2.account
        });

        // Cancel with 50% refund pool (25k instead of 50k)
        await tranche.write.markAsCancelled({ account: owner.account });
        const refundPool = parseUnits("25000", 6);
        await mockUSDC.write.mint([owner.account.address, refundPool]);
        await mockUSDC.write.approve([tranche.address, refundPool], {
          account: owner.account
        });
        await tranche.write.depositRefundFunds([refundPool], {
          account: owner.account
        });

        // Investor1 should get 60% of pool (30k/50k * 25k = 15k)
        const balance1Before = await mockUSDC.read.balanceOf([
          investor1.account.address
        ]);
        await tranche.write.claimRefund({ account: investor1.account });
        const balance1After = await mockUSDC.read.balanceOf([
          investor1.account.address
        ]);
        const refund1 = balance1After - balance1Before;

        // Investor2 should get 40% of pool (20k/50k * 25k = 10k)
        const balance2Before = await mockUSDC.read.balanceOf([
          investor2.account.address
        ]);
        await tranche.write.claimRefund({ account: investor2.account });
        const balance2After = await mockUSDC.read.balanceOf([
          investor2.account.address
        ]);
        const refund2 = balance2After - balance2Before;

        assert.equal(refund1, parseUnits("15000", 6));
        assert.equal(refund2, parseUnits("10000", 6));
      });

      it("Should return correct refund amount in view function", async function () {
        const { tranche, mockUSDC } = await deployFixture();

        // Invest
        const investAmount = parseUnits("50000", 6);
        await mockUSDC.write.approve([tranche.address, investAmount], {
          account: investor1.account
        });
        await tranche.write.invest([investAmount], {
          account: investor1.account
        });

        // Before cancellation
        let refundAmount = await tranche.read.getRefundAmount([
          investor1.account.address
        ]);
        assert.equal(refundAmount, 0n);

        // After cancellation and deposit
        await tranche.write.markAsCancelled({ account: owner.account });
        await mockUSDC.write.mint([owner.account.address, investAmount]);
        await mockUSDC.write.approve([tranche.address, investAmount], {
          account: owner.account
        });
        await tranche.write.depositRefundFunds([investAmount], {
          account: owner.account
        });

        refundAmount = await tranche.read.getRefundAmount([
          investor1.account.address
        ]);
        assert.equal(refundAmount, investAmount);
      });

      it("Should return zero refund if already claimed", async function () {
        const { tranche, mockUSDC } = await deployFixture();

        // Invest
        const investAmount = parseUnits("50000", 6);
        await mockUSDC.write.approve([tranche.address, investAmount], {
          account: investor1.account
        });
        await tranche.write.invest([investAmount], {
          account: investor1.account
        });

        // Cancel and refund
        await tranche.write.markAsCancelled({ account: owner.account });
        await mockUSDC.write.mint([owner.account.address, investAmount]);
        await mockUSDC.write.approve([tranche.address, investAmount], {
          account: owner.account
        });
        await tranche.write.depositRefundFunds([investAmount], {
          account: owner.account
        });

        await tranche.write.claimRefund({ account: investor1.account });

        const refundAmount = await tranche.read.getRefundAmount([
          investor1.account.address
        ]);
        assert.equal(refundAmount, 0n);
      });

      it("Should correctly report refund availability", async function () {
        const { tranche, mockUSDC } = await deployFixture();

        // Initially not available
        let isAvailable = await tranche.read.isRefundAvailable();
        assert.equal(isAvailable, false);

        // After cancellation but no deposit
        await tranche.write.markAsCancelled({ account: owner.account });
        isAvailable = await tranche.read.isRefundAvailable();
        assert.equal(isAvailable, false);

        // After deposit
        const refundAmount = parseUnits("50000", 6);
        await mockUSDC.write.mint([owner.account.address, refundAmount]);
        await mockUSDC.write.approve([tranche.address, refundAmount], {
          account: owner.account
        });
        await tranche.write.depositRefundFunds([refundAmount], {
          account: owner.account
        });

        isAvailable = await tranche.read.isRefundAvailable();
        assert.equal(isAvailable, true);
      });
    });

    describe("Transfer Freeze Tests", async function () {
      it("Should block transfers when marked as successful", async function () {
        const { tranche, mockUSDC } = await deployFixture();

        // Invest - use both investors to reach goal
        const invest1 = parseUnits("50000", 6);
        await mockUSDC.write.approve([tranche.address, invest1], {
          account: investor1.account
        });
        await tranche.write.invest([invest1], {
          account: investor1.account
        });

        const invest2 = parseUnits("50000", 6);
        await mockUSDC.write.approve([tranche.address, invest2], {
          account: investor2.account
        });
        await tranche.write.invest([invest2], {
          account: investor2.account
        });

        // Mark as successful
        await tranche.write.markAsSuccessful({ account: owner.account });

        // Try to transfer - should fail
        await assert.rejects(
          tranche.write.transfer(
            [investor2.account.address, parseUnits("1000", 18)],
            { account: investor1.account }
          ),
          /Transfers frozen - tranche closed/
        );
      });

      it("Should block transfers when marked as cancelled", async function () {
        const { tranche, mockUSDC } = await deployFixture();

        // Invest
        const investAmount = parseUnits("50000", 6);
        await mockUSDC.write.approve([tranche.address, investAmount], {
          account: investor1.account
        });
        await tranche.write.invest([investAmount], {
          account: investor1.account
        });

        // Mark as cancelled
        await tranche.write.markAsCancelled({ account: owner.account });

        // Try to transfer - should fail
        await assert.rejects(
          tranche.write.transfer(
            [investor2.account.address, parseUnits("1000", 18)],
            { account: investor1.account }
          ),
          /Transfers frozen - tranche closed/
        );
      });

      it("Should allow burning when closed (for refunds)", async function () {
        const { tranche, mockUSDC } = await deployFixture();

        // Invest
        const investAmount = parseUnits("50000", 6);
        await mockUSDC.write.approve([tranche.address, investAmount], {
          account: investor1.account
        });
        await tranche.write.invest([investAmount], {
          account: investor1.account
        });

        // Cancel and setup refund
        await tranche.write.markAsCancelled({ account: owner.account });
        await mockUSDC.write.mint([owner.account.address, investAmount]);
        await mockUSDC.write.approve([tranche.address, investAmount], {
          account: owner.account
        });
        await tranche.write.depositRefundFunds([investAmount], {
          account: owner.account
        });

        // Claim refund (which burns tokens) - should succeed
        await tranche.write.claimRefund({ account: investor1.account });

        const balance = await tranche.read.balanceOf([
          investor1.account.address
        ]);
        assert.equal(balance, 0n);
      });

      it("Should allow transfers while Active", async function () {
        const { tranche, mockUSDC } = await deployFixture();

        // Invest
        const investAmount = parseUnits("50000", 6);
        await mockUSDC.write.approve([tranche.address, investAmount], {
          account: investor1.account
        });
        await tranche.write.invest([investAmount], {
          account: investor1.account
        });

        // Transfer while active - should succeed
        const transferAmount = parseUnits("1000", 18);
        await tranche.write.transfer(
          [investor2.account.address, transferAmount],
          { account: investor1.account }
        );

        const balance = await tranche.read.balanceOf([
          investor2.account.address
        ]);
        assert.equal(balance, transferAmount);
      });
    });
  });
});
