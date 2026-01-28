import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

const RevoraSystemModule = buildModule("RevoraSystem", (m) => {
  // Parameters with defaults
  const revoraTreasury = m.getParameter("revoraTreasury", "0x0000000000000000000000000000000000000000"); // MUST be set
  const owner = m.getParameter("owner", "0x0000000000000000000000000000000000000000"); // MUST be set

  // Deploy RevenueDistributor
  const revenueDistributor = m.contract("RevenueDistributor", [
    revoraTreasury,
    owner
  ]);

  // Deploy TrancheFactory
  const trancheFactory = m.contract("TrancheFactory", [
    revenueDistributor,
    owner
  ]);

  return {
    revenueDistributor,
    trancheFactory
  };
});

export default RevoraSystemModule;
