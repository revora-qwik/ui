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
});
