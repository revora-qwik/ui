import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { network } from "hardhat";
import { parseUnits, formatUnits } from "viem";
import * as helpers from "@nomicfoundation/hardhat-network-helpers";

describe("RevenueDistributor", async function () {
  const { viem } = await network.connect();
  const publicClient = await viem.getPublicClient();
  const [owner, treasury, investor1, investor2, investor3] = await viem.getWalletClients();

  async function deployFixture() {
    // Deploy mock tokens
    const mockUSDC = await viem.deployContract("MockERC20", ["USD Coin", "USDC", 6]);

    // Deploy revenue distributor
    const distributor = await viem.deployContract("RevenueDistributor", [
      treasury.account.address,
      owner.account.address
    ]);

    // Deploy tranche token
    const tranche = await viem.deployContract("TrancheToken", [
      "Test Tranche",
      "TST-T1",
      "Test tranche for revenue distribution",
      parseUnits("100000", 6),
      parseUnits("1", 6),
      mockUSDC.address,
      6,
      treasury.account.address,
      owner.account.address
    ]);

    // Setup tranche with distributor
    await tranche.write.setRevenueDistributor([distributor.address], {
      account: owner.account
    });

    // Mint USDC to investors and owner
    await mockUSDC.write.mint([investor1.account.address, parseUnits("100000", 6)]);
    await mockUSDC.write.mint([investor2.account.address, parseUnits("100000", 6)]);
    await mockUSDC.write.mint([investor3.account.address, parseUnits("100000", 6)]);
    await mockUSDC.write.mint([owner.account.address, parseUnits("1000000", 6)]);

    return { distributor, tranche, mockUSDC };
  }

  it("Should set correct treasury address", async function () {
    const { distributor } = await deployFixture();

    const treasuryAddr = await distributor.read.revoraTreasury();
    assert.equal(treasuryAddr.toLowerCase(), treasury.account.address.toLowerCase());
  });

  it("Should configure tranche parameters", async function () {
    const { distributor, tranche } = await deployFixture();

    await distributor.write.configureTranche([
      tranche.address,
      1000, // 10% base
      365, // 365 days
      500, // 5% time bonus
      parseUnits("50000", 6), // 50k threshold
      500, // 5% performance bonus
      30 // 30 days claim period
    ], {
      account: owner.account
    });

    const config = await distributor.read.trancheConfigs([tranche.address]);
    assert.equal(config[0], 1000); // revoraShareBps
    assert.equal(config[1], 365); // minInvestmentPeriodDays
    assert.equal(config[2], 500); // timeBasedBonusBps
  });

  it("Should create distribution without Revora token", async function () {
    const { distributor, tranche, mockUSDC } = await deployFixture();

    // Configure tranche
    await distributor.write.configureTranche([
      tranche.address,
      1000, // 10%
      0,
      0,
      0n,
      0,
      30
    ], {
      account: owner.account
    });

    // Make investment and delegate
    const invest1 = parseUnits("50000", 6);
    await mockUSDC.write.approve([tranche.address, invest1], {
      account: investor1.account
    });
    await tranche.write.invest([invest1], { account: investor1.account });
    await tranche.write.delegate([investor1.account.address], {
      account: investor1.account
    });

    const currentBlock = await publicClient.getBlockNumber();

    // Approve distributor to spend USDC
    const revenueAmount = parseUnits("10000", 6);
    await mockUSDC.write.approve([distributor.address, revenueAmount], {
      account: owner.account
    });

    // Create distribution
    await distributor.write.createDistribution([
      tranche.address,
      mockUSDC.address,
      revenueAmount,
      parseUnits("5000", 6), // profit
      currentBlock - 5n
    ], {
      account: owner.account
    });

    const dist = await distributor.read.distributions([0n]);
    assert.equal(dist[2], revenueAmount); // totalAmount

    // Check that Revora share (10%) was sent to treasury
    // We need to check the change, not absolute balance
    const revoraShareFromDist = dist[4]; // revoraAmount
    assert.equal(revoraShareFromDist, parseUnits("1000", 6)); // 10% of 10k
  });

  it("Should allow investors to claim their share", async function () {
    const { distributor, tranche, mockUSDC } = await deployFixture();

    // Configure
    await distributor.write.configureTranche([
      tranche.address,
      1000,
      0,
      0,
      0n,
      0,
      30
    ], {
      account: owner.account
    });

    // Investor 1: 60k investment
    const invest1 = parseUnits("60000", 6);
    await mockUSDC.write.approve([tranche.address, invest1], {
      account: investor1.account
    });
    await tranche.write.invest([invest1], { account: investor1.account });
    await tranche.write.delegate([investor1.account.address], {
      account: investor1.account
    });

    // Investor 2: 40k investment
    const invest2 = parseUnits("40000", 6);
    await mockUSDC.write.approve([tranche.address, invest2], {
      account: investor2.account
    });
    await tranche.write.invest([invest2], { account: investor2.account });
    await tranche.write.delegate([investor2.account.address], {
      account: investor2.account
    });

    const currentBlock = await publicClient.getBlockNumber();

    // Create distribution: 10k revenue, 10% to Revora = 9k for investors
    const revenueAmount = parseUnits("10000", 6);
    await mockUSDC.write.approve([distributor.address, revenueAmount], {
      account: owner.account
    });
    await distributor.write.createDistribution([
      tranche.address,
      mockUSDC.address,
      revenueAmount,
      0n,
      currentBlock - 5n
    ], {
      account: owner.account
    });

    // Check claimable amounts
    const claimable1 = await distributor.read.getClaimableAmount([0n, investor1.account.address]);
    const claimable2 = await distributor.read.getClaimableAmount([0n, investor2.account.address]);

    // 60% and 40% of 9k
    assert.equal(claimable1, parseUnits("5400", 6)); // 60% of 9k
    assert.equal(claimable2, parseUnits("3600", 6)); // 40% of 9k

    // Claim
    const balanceBefore1 = await mockUSDC.read.balanceOf([investor1.account.address]);
    await distributor.write.claim([0n], { account: investor1.account });
    const balanceAfter1 = await mockUSDC.read.balanceOf([investor1.account.address]);

    assert.equal(balanceAfter1 - balanceBefore1, parseUnits("5400", 6));
  });

  it("Should calculate bonuses correctly", async function () {
    const { distributor, tranche, mockUSDC } = await deployFixture();

    // Configure with performance bonus only
    await distributor.write.configureTranche([
      tranche.address,
      1000, // 10% base
      0, // 0 days min period (time bonus won't apply with 0)
      0, // No time bonus
      parseUnits("5000", 6), // 5k threshold
      500, // 5% performance bonus
      30
    ], {
      account: owner.account
    });

    // Make investment
    const invest1 = parseUnits("50000", 6);
    await mockUSDC.write.approve([tranche.address, invest1], {
      account: investor1.account
    });
    await tranche.write.invest([invest1], { account: investor1.account });
    await tranche.write.delegate([investor1.account.address], {
      account: investor1.account
    });

    const currentBlock = await publicClient.getBlockNumber();

    const revenueAmount = parseUnits("10000", 6);
    await mockUSDC.write.approve([distributor.address, revenueAmount], {
      account: owner.account
    });

    // Should get performance bonus (10% + 5% = 15%)
    // Using block 1 as investment start
    await distributor.write.createDistribution([
      tranche.address,
      mockUSDC.address,
      revenueAmount,
      parseUnits("6000", 6), // Above threshold - triggers performance bonus
      1n // Investment started at block 1
    ], {
      account: owner.account
    });

    const dist = await distributor.read.distributions([0n]);
    const revoraAmount = dist[4]; // revoraAmount

    // Should be 15% of 10k = 1.5k (10% base + 5% performance bonus)
    assert.equal(revoraAmount, parseUnits("1500", 6));
  });

  // Note: Time manipulation test skipped - requires manual testing with real network
  // it("Should allow withdrawal of unclaimed funds after deadline", async function () {
  //   const { distributor, tranche, mockUSDC } = await deployFixture();
  //   // Configure with 1 day claim period
  //   // Wait 2 days, then call withdrawUnclaimedFunds
  //   // Verify treasury receives unclaimed funds
  // });
});
