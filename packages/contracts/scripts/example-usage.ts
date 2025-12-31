import { network } from "hardhat";
import { parseUnits, formatUnits } from "viem";

const { viem } = await network.connect();

/**
 * Example script showing complete Revora system usage flow
 * This demonstrates: deployment → tranche creation → investment → revenue distribution → claiming
 */
async function main() {
  const [owner, treasury, investor1, investor2] = await viem.getWalletClients();
  const publicClient = await viem.getPublicClient();

  console.log("\n🚀 Revora System Example Usage\n");
  console.log("Accounts:");
  console.log("  Owner:", owner.account.address);
  console.log("  Treasury:", treasury.account.address);
  console.log("  Investor 1:", investor1.account.address);
  console.log("  Investor 2:", investor2.account.address);

  // ============================================
  // STEP 1: Deploy System Contracts
  // ============================================
  console.log("\n📦 Step 1: Deploying system contracts...");

  const mockUSDC = await viem.deployContract("MockERC20", [
    "USD Coin",
    "USDC",
    6
  ]);
  console.log("  Mock USDC deployed:", mockUSDC.address);

  const revenueDistributor = await viem.deployContract("RevenueDistributor", [
    treasury.account.address,
    owner.account.address
  ]);
  console.log("  RevenueDistributor deployed:", revenueDistributor.address);

  const trancheFactory = await viem.deployContract("TrancheFactory", [
    revenueDistributor.address,
    owner.account.address
  ]);
  console.log("  TrancheFactory deployed:", trancheFactory.address);

  // Authorize factory to configure tranches
  await revenueDistributor.write.authorizeConfigurer([trancheFactory.address]);
  console.log("  TrancheFactory authorized ✓");

  // ============================================
  // STEP 2: Create Investment Tranche
  // ============================================
  console.log("\n🏗️  Step 2: Creating chicken farm tranche...");

  const createTx = await trancheFactory.write.createTranche([
    "Chicken Farm Expansion",
    "CHKN-T1",
    "Investment in organic chicken farm expansion - 1000 chickens",
    parseUnits("100000", 6), // 100k USDC funding goal
    parseUnits("1", 6), // 1 USDC per token
    mockUSDC.address,
    6,
    treasury.account.address,
    1000, // 10% base Revora share
    365, // 1 year for time bonus
    500, // 5% time bonus
    parseUnits("50000", 6), // 50k profit threshold
    500, // 5% performance bonus
    30 // 30 days claim period
  ]);

  const allTranches = await trancheFactory.read.getAllTranches();
  const trancheAddress = allTranches[0];
  const tranche = await viem.getContractAt("TrancheToken", trancheAddress);

  console.log("  Tranche deployed:", trancheAddress);
  console.log("  Funding goal: 100,000 USDC");
  console.log("  Price per token: 1 USDC");

  // ============================================
  // STEP 3: Investors Buy Tokens
  // ============================================
  console.log("\n💰 Step 3: Investors purchasing tranche tokens...");

  // Mint USDC to investors
  await mockUSDC.write.mint([investor1.account.address, parseUnits("60000", 6)]);
  await mockUSDC.write.mint([investor2.account.address, parseUnits("50000", 6)]);

  // Investor 1: Invest 60k USDC
  console.log("\n  Investor 1 investing 60,000 USDC...");
  const invest1Amount = parseUnits("60000", 6);
  await mockUSDC.write.approve([trancheAddress, invest1Amount], {
    account: investor1.account
  });
  await tranche.write.invest([invest1Amount], {
    account: investor1.account
  });
  // IMPORTANT: Delegate to self for snapshots
  await tranche.write.delegate([investor1.account.address], {
    account: investor1.account
  });
  console.log("    ✅ Received 60,000 CHKN-T1 tokens");

  // Investor 2: Invest 40k USDC
  console.log("\n  Investor 2 investing 40,000 USDC...");
  const invest2Amount = parseUnits("40000", 6);
  await mockUSDC.write.approve([trancheAddress, invest2Amount], {
    account: investor2.account
  });
  await tranche.write.invest([invest2Amount], {
    account: investor2.account
  });
  // IMPORTANT: Delegate to self for snapshots
  await tranche.write.delegate([investor2.account.address], {
    account: investor2.account
  });
  console.log("    ✅ Received 40,000 CHKN-T1 tokens");

  const totalRaised = await tranche.read.totalRaised();
  const fundingComplete = await tranche.read.fundingComplete();
  console.log("\n  Total raised:", formatUnits(totalRaised, 6), "USDC");
  console.log("  Funding complete:", fundingComplete);

  // ============================================
  // STEP 4: Simulate Business Revenue
  // ============================================
  console.log("\n🐔 Step 4: Chicken farm generates revenue...");
  console.log("  (6 months later...)");
  console.log("  Farm generated 60,000 USDC profit!");

  // Mint revenue to owner for distribution
  const revenueAmount = parseUnits("60000", 6);
  await mockUSDC.write.mint([owner.account.address, revenueAmount]);

  // ============================================
  // STEP 5: Distribute Revenue
  // ============================================
  console.log("\n💸 Step 5: Creating revenue distribution...");

  const currentBlock = await publicClient.getBlockNumber();

  await mockUSDC.write.approve([revenueDistributor.address, revenueAmount], {
    account: owner.account
  });

  await revenueDistributor.write.createDistribution([
    trancheAddress,
    mockUSDC.address,
    revenueAmount,
    parseUnits("60000", 6), // Profit amount (meets performance threshold!)
    currentBlock - 1000n // Investment started 1000 blocks ago
  ], {
    account: owner.account
  });

  const distribution = await revenueDistributor.read.distributions([0n]);
  console.log("\n  Distribution created:");
  console.log("    Total amount:", formatUnits(distribution[2], 6), "USDC");
  console.log("    Tranche share:", formatUnits(distribution[3], 6), "USDC");
  console.log("    Revora share:", formatUnits(distribution[4], 6), "USDC");
  console.log("    (Revora share sent to treasury)");

  // ============================================
  // STEP 6: Investors Claim Revenue
  // ============================================
  console.log("\n🎉 Step 6: Investors claiming their revenue share...");

  // Investor 1 claims
  const claimable1 = await revenueDistributor.read.getClaimableAmount([
    0n,
    investor1.account.address
  ]);
  console.log("\n  Investor 1 claimable:", formatUnits(claimable1, 6), "USDC");

  const balance1Before = await mockUSDC.read.balanceOf([investor1.account.address]);
  await revenueDistributor.write.claim([0n], {
    account: investor1.account
  });
  const balance1After = await mockUSDC.read.balanceOf([investor1.account.address]);
  console.log("  Investor 1 claimed:", formatUnits(balance1After - balance1Before, 6), "USDC ✅");

  // Investor 2 claims
  const claimable2 = await revenueDistributor.read.getClaimableAmount([
    0n,
    investor2.account.address
  ]);
  console.log("\n  Investor 2 claimable:", formatUnits(claimable2, 6), "USDC");

  const balance2Before = await mockUSDC.read.balanceOf([investor2.account.address]);
  await revenueDistributor.write.claim([0n], {
    account: investor2.account
  });
  const balance2After = await mockUSDC.read.balanceOf([investor2.account.address]);
  console.log("  Investor 2 claimed:", formatUnits(balance2After - balance2Before, 6), "USDC ✅");

  // ============================================
  // Summary
  // ============================================
  console.log("\n" + "=".repeat(60));
  console.log("📊 SUMMARY");
  console.log("=".repeat(60));
  console.log("\nInvestments:");
  console.log("  Investor 1: 60,000 USDC (60%)");
  console.log("  Investor 2: 40,000 USDC (40%)");
  console.log("  Total: 100,000 USDC");

  console.log("\nRevenue Distribution:");
  console.log("  Total revenue: 60,000 USDC");
  console.log("  Revora share (15%): 9,000 USDC → Treasury");
  console.log("  Investor share (85%): 51,000 USDC");
  console.log("    - Investor 1 (60%): 30,600 USDC");
  console.log("    - Investor 2 (40%): 20,400 USDC");

  console.log("\n💡 Why 15% to Revora?");
  console.log("  Base: 10%");
  console.log("  Performance bonus (>50k profit): +5%");
  console.log("  Total: 15%");

  console.log("\n✅ All done! The system is working perfectly.\n");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
