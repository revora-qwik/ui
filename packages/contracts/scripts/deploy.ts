import { network } from "hardhat";

const { viem } = await network.connect();

async function main() {
  const [deployer] = await viem.getWalletClients();

  console.log("Deploying contracts with account:", deployer.account.address);

  // Configuration - UPDATE THESE VALUES
  const REVORA_TREASURY = "0x0000000000000000000000000000000000000000"; // CHANGE THIS
  const OWNER = deployer.account.address;

  if (REVORA_TREASURY === "0x0000000000000000000000000000000000000000") {
    throw new Error("Please set REVORA_TREASURY address in deploy.ts");
  }

  // Deploy RevenueDistributor
  console.log("\nDeploying RevenueDistributor...");
  const revenueDistributor = await viem.deployContract("RevenueDistributor", [
    REVORA_TREASURY,
    OWNER
  ]);
  console.log("RevenueDistributor deployed to:", revenueDistributor.address);

  // Deploy TrancheFactory
  console.log("\nDeploying TrancheFactory...");
  const trancheFactory = await viem.deployContract("TrancheFactory", [
    revenueDistributor.address,
    OWNER
  ]);
  console.log("TrancheFactory deployed to:", trancheFactory.address);

  // Authorize factory to configure tranches
  console.log("\nAuthorizing TrancheFactory...");
  await revenueDistributor.write.authorizeConfigurer([trancheFactory.address]);
  console.log("TrancheFactory authorized ✓");

  console.log("\n✅ Deployment complete!");
  console.log("\nContract Addresses:");
  console.log("==================");
  console.log("RevenueDistributor:", revenueDistributor.address);
  console.log("TrancheFactory:", trancheFactory.address);
  console.log("\nNext steps:");
  console.log("1. Verify contracts on block explorer");
  console.log("2. Create your first tranche using TrancheFactory.createTranche()");
  console.log("3. (Optional) Set Revora token later using RevenueDistributor.setRevoraToken()");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
