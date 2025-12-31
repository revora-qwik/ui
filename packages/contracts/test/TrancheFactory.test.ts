import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { network } from "hardhat";
import { parseUnits } from "viem";

describe("TrancheFactory", async function () {
  const { viem } = await network.connect();
  const publicClient = await viem.getPublicClient();
  const [owner, treasury, user1] = await viem.getWalletClients();

  async function deployFixture() {
    // Deploy mock USDC
    const mockUSDC = await viem.deployContract("MockERC20", [
      "USD Coin",
      "USDC",
      6
    ]);

    // Deploy revenue distributor
    const distributor = await viem.deployContract("RevenueDistributor", [
      treasury.account.address,
      owner.account.address
    ]);

    // Deploy factory
    const factory = await viem.deployContract("TrancheFactory", [
      distributor.address,
      owner.account.address
    ]);

    // Authorize factory to configure tranches
    await distributor.write.authorizeConfigurer([factory.address], {
      account: owner.account
    });

    return { factory, distributor, mockUSDC };
  }

  it("Should set correct revenue distributor", async function () {
    const { factory, distributor } = await deployFixture();

    const distAddr = await factory.read.revenueDistributor();
    assert.equal(distAddr.toLowerCase(), distributor.address.toLowerCase());
  });

  it("Should start with zero tranches", async function () {
    const { factory } = await deployFixture();

    assert.equal(await factory.read.getTranchesCount(), 0n);
  });

  it("Should create a new tranche", async function () {
    const { factory, mockUSDC } = await deployFixture();

    await factory.write.createTranche([
      "Chicken Farm",
      "CHKN-T1",
      "Investment in chicken farm expansion",
      parseUnits("100000", 6),
      parseUnits("1", 6),
      mockUSDC.address,
      6,
      treasury.account.address,
      1000, // 10% Revora share
      365, // 1 year min period
      500, // 5% time bonus
      parseUnits("50000", 6), // 50k threshold
      500, // 5% performance bonus
      30 // 30 days claim period
    ], {
      account: owner.account
    });

    assert.equal(await factory.read.getTranchesCount(), 1n);

    const allTranches = await factory.read.getAllTranches();
    assert.equal(allTranches.length, 1);
  });

  it("Should properly configure created tranche", async function () {
    const { factory, distributor, mockUSDC } = await deployFixture();

    await factory.write.createTranche([
      "Chicken Farm",
      "CHKN-T1",
      "Investment in chicken farm",
      parseUnits("100000", 6),
      parseUnits("1", 6),
      mockUSDC.address,
      6,
      treasury.account.address,
      1000,
      365,
      500,
      parseUnits("50000", 6),
      500,
      30
    ], {
      account: owner.account
    });

    const allTranches = await factory.read.getAllTranches();
    const trancheAddress = allTranches[0];

    // Check tranche info
    const info = await factory.read.trancheInfo([trancheAddress]);
    assert.equal(info[1], "Chicken Farm"); // name
    assert.equal(info[2], "CHKN-T1"); // symbol
    assert.equal(info[7], true); // isActive

    // Check tranche is configured in distributor
    const config = await distributor.read.trancheConfigs([trancheAddress]);
    assert.equal(config[0], 1000); // revoraShareBps
    assert.equal(config[6], true); // isConfigured
  });

  it("Should track multiple tranches", async function () {
    const { factory, mockUSDC } = await deployFixture();

    // Create 3 tranches
    for (let i = 0; i < 3; i++) {
      await factory.write.createTranche([
        `Tranche ${i}`,
        `TRN-${i}`,
        `Description ${i}`,
        parseUnits("100000", 6),
        parseUnits("1", 6),
        mockUSDC.address,
        6,
        treasury.account.address,
        1000,
        0,
        0,
        0n,
        0,
        30
      ], {
        account: owner.account
      });
    }

    assert.equal(await factory.read.getTranchesCount(), 3n);

    const allTranches = await factory.read.getAllTranches();
    assert.equal(allTranches.length, 3);
  });

  it("Should deactivate tranche", async function () {
    const { factory, mockUSDC } = await deployFixture();

    await factory.write.createTranche([
      "Test Tranche",
      "TST-T1",
      "Test",
      parseUnits("100000", 6),
      parseUnits("1", 6),
      mockUSDC.address,
      6,
      treasury.account.address,
      1000,
      0,
      0,
      0n,
      0,
      30
    ], {
      account: owner.account
    });

    const allTranches = await factory.read.getAllTranches();
    const trancheAddress = allTranches[0];

    // Deactivate
    await factory.write.deactivateTranche([trancheAddress], {
      account: owner.account
    });

    const info = await factory.read.trancheInfo([trancheAddress]);
    assert.equal(info[7], false); // isActive

    // Get tranche contract and check funding is paused
    const tranche = await viem.getContractAt("TrancheToken", trancheAddress);
    assert.equal(await tranche.read.fundingActive(), false);
  });

  it("Should reactivate tranche", async function () {
    const { factory, mockUSDC } = await deployFixture();

    await factory.write.createTranche([
      "Test Tranche",
      "TST-T1",
      "Test",
      parseUnits("100000", 6),
      parseUnits("1", 6),
      mockUSDC.address,
      6,
      treasury.account.address,
      1000,
      0,
      0,
      0n,
      0,
      30
    ], {
      account: owner.account
    });

    const allTranches = await factory.read.getAllTranches();
    const trancheAddress = allTranches[0];

    // Deactivate then reactivate
    await factory.write.deactivateTranche([trancheAddress], {
      account: owner.account
    });
    await factory.write.reactivateTranche([trancheAddress], {
      account: owner.account
    });

    const info = await factory.read.trancheInfo([trancheAddress]);
    assert.equal(info[7], true); // isActive
  });

  it("Should get active tranches only", async function () {
    const { factory, mockUSDC } = await deployFixture();

    // Create 3 tranches
    for (let i = 0; i < 3; i++) {
      await factory.write.createTranche([
        `Tranche ${i}`,
        `TRN-${i}`,
        `Description ${i}`,
        parseUnits("100000", 6),
        parseUnits("1", 6),
        mockUSDC.address,
        6,
        treasury.account.address,
        1000,
        0,
        0,
        0n,
        0,
        30
      ], {
        account: owner.account
      });
    }

    const allTranches = await factory.read.getAllTranches();

    // Deactivate the middle one
    await factory.write.deactivateTranche([allTranches[1]], {
      account: owner.account
    });

    const activeTranches = await factory.read.getActiveTranches();
    assert.equal(activeTranches.length, 2);

    // Check that it includes the first and third, but not the second
    const hasFirst = activeTranches.some(addr =>
      addr.toLowerCase() === allTranches[0].toLowerCase()
    );
    const hasThird = activeTranches.some(addr =>
      addr.toLowerCase() === allTranches[2].toLowerCase()
    );
    const hasSecond = activeTranches.some(addr =>
      addr.toLowerCase() === allTranches[1].toLowerCase()
    );

    assert.equal(hasFirst, true);
    assert.equal(hasThird, true);
    assert.equal(hasSecond, false);
  });

  it("Should transfer tranche ownership", async function () {
    const { factory, mockUSDC } = await deployFixture();

    await factory.write.createTranche([
      "Test",
      "TST",
      "Test",
      parseUnits("100000", 6),
      parseUnits("1", 6),
      mockUSDC.address,
      6,
      treasury.account.address,
      1000,
      0,
      0,
      0n,
      0,
      30
    ], {
      account: owner.account
    });

    const allTranches = await factory.read.getAllTranches();
    const trancheAddress = allTranches[0];

    // Transfer ownership
    await factory.write.transferTrancheOwnership([trancheAddress, user1.account.address], {
      account: owner.account
    });

    const tranche = await viem.getContractAt("TrancheToken", trancheAddress);
    const trancheOwner = await tranche.read.owner();
    assert.equal(trancheOwner.toLowerCase(), user1.account.address.toLowerCase());
  });
});
