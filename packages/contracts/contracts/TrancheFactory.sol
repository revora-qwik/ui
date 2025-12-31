// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./TrancheToken.sol";
import "./RevenueDistributor.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title TrancheFactory
 * @notice Factory contract for deploying and managing investment tranches
 * @dev Creates new TrancheToken contracts and configures them with RevenueDistributor
 */
contract TrancheFactory is Ownable {
    struct TrancheInfo {
        address trancheToken;
        string name;
        string symbol;
        string projectDescription;
        uint256 fundingGoal;
        uint256 pricePerToken;
        uint256 createdAt;
        bool isActive;
    }

    // Revenue distributor reference
    RevenueDistributor public revenueDistributor;

    // All deployed tranches
    address[] public allTranches;
    mapping(address => TrancheInfo) public trancheInfo;
    mapping(address => bool) public isTranche;

    event TrancheCreated(
        address indexed trancheToken,
        string name,
        string symbol,
        string projectDescription,
        uint256 fundingGoal,
        uint256 pricePerToken
    );

    event TrancheDeactivated(address indexed trancheToken);

    constructor(
        address _revenueDistributor,
        address initialOwner
    ) Ownable(initialOwner) {
        require(
            _revenueDistributor != address(0),
            "Invalid distributor address"
        );
        revenueDistributor = RevenueDistributor(_revenueDistributor);
    }

    /**
     * @notice Create a new investment tranche
     * @param name Token name
     * @param symbol Token symbol
     * @param projectDescription Description of the business/project
     * @param fundingGoal Total funding goal in payment token
     * @param pricePerToken Price per tranche token in payment token
     * @param paymentToken Address of payment token (USDC, USDT, etc.)
     * @param paymentTokenDecimals Decimals of payment token
     * @param treasury Address where investment funds will be sent
     * @param revoraShareBps Revora share in basis points
     * @param minInvestmentPeriodDays Minimum investment period for time bonus
     * @param timeBasedBonusBps Time-based bonus in basis points
     * @param performanceThreshold Performance threshold for bonus
     * @param performanceBonusBps Performance-based bonus in basis points
     * @param claimPeriodDays Claim period duration in days
     * @return trancheAddress Address of the newly created tranche
     */
    function createTranche(
        string memory name,
        string memory symbol,
        string memory projectDescription,
        uint256 fundingGoal,
        uint256 pricePerToken,
        address paymentToken,
        uint8 paymentTokenDecimals,
        address treasury,
        uint16 revoraShareBps,
        uint32 minInvestmentPeriodDays,
        uint16 timeBasedBonusBps,
        uint256 performanceThreshold,
        uint16 performanceBonusBps,
        uint32 claimPeriodDays
    ) external onlyOwner returns (address) {
        require(fundingGoal > 0, "Funding goal must be > 0");
        require(pricePerToken > 0, "Price must be > 0");
        require(paymentToken != address(0), "Invalid payment token");
        require(treasury != address(0), "Invalid treasury");

        // Deploy new tranche token
        TrancheToken tranche = new TrancheToken(
            name,
            symbol,
            projectDescription,
            fundingGoal,
            pricePerToken,
            paymentToken,
            paymentTokenDecimals,
            treasury,
            address(this) // Factory is initial owner
        );

        address trancheAddress = address(tranche);

        // Set revenue distributor on tranche
        tranche.setRevenueDistributor(address(revenueDistributor));

        // Configure tranche in revenue distributor
        revenueDistributor.configureTranche(
            trancheAddress,
            revoraShareBps,
            minInvestmentPeriodDays,
            timeBasedBonusBps,
            performanceThreshold,
            performanceBonusBps,
            claimPeriodDays
        );

        // Store tranche info
        trancheInfo[trancheAddress] = TrancheInfo({
            trancheToken: trancheAddress,
            name: name,
            symbol: symbol,
            projectDescription: projectDescription,
            fundingGoal: fundingGoal,
            pricePerToken: pricePerToken,
            createdAt: block.timestamp,
            isActive: true
        });

        allTranches.push(trancheAddress);
        isTranche[trancheAddress] = true;

        emit TrancheCreated(
            trancheAddress,
            name,
            symbol,
            projectDescription,
            fundingGoal,
            pricePerToken
        );

        return trancheAddress;
    }

    /**
     * @notice Deactivate a tranche (stops new investments)
     * @param trancheToken Address of the tranche to deactivate
     */
    function deactivateTranche(address trancheToken) external onlyOwner {
        require(isTranche[trancheToken], "Not a valid tranche");
        require(trancheInfo[trancheToken].isActive, "Already deactivated");

        TrancheToken(trancheToken).pauseFunding();
        trancheInfo[trancheToken].isActive = false;

        emit TrancheDeactivated(trancheToken);
    }

    /**
     * @notice Reactivate a tranche
     * @param trancheToken Address of the tranche to reactivate
     */
    function reactivateTranche(address trancheToken) external onlyOwner {
        require(isTranche[trancheToken], "Not a valid tranche");
        require(!trancheInfo[trancheToken].isActive, "Already active");

        TrancheToken(trancheToken).activateFunding();
        trancheInfo[trancheToken].isActive = true;
    }

    /**
     * @notice Transfer ownership of a tranche to another address
     * @param trancheToken Address of the tranche
     * @param newOwner New owner address
     */
    function transferTrancheOwnership(
        address trancheToken,
        address newOwner
    ) external onlyOwner {
        require(isTranche[trancheToken], "Not a valid tranche");
        require(newOwner != address(0), "Invalid new owner");

        TrancheToken(trancheToken).transferOwnership(newOwner);
    }

    /**
     * @notice Get total number of tranches
     * @return count Total tranche count
     */
    function getTranchesCount() external view returns (uint256) {
        return allTranches.length;
    }

    /**
     * @notice Get all tranche addresses
     * @return addresses Array of all tranche addresses
     */
    function getAllTranches() external view returns (address[] memory) {
        return allTranches;
    }

    /**
     * @notice Get active tranches
     * @return addresses Array of active tranche addresses
     */
    function getActiveTranches() external view returns (address[] memory) {
        uint256 activeCount = 0;
        for (uint256 i = 0; i < allTranches.length; i++) {
            if (trancheInfo[allTranches[i]].isActive) {
                activeCount++;
            }
        }

        address[] memory activeTranches = new address[](activeCount);
        uint256 index = 0;
        for (uint256 i = 0; i < allTranches.length; i++) {
            if (trancheInfo[allTranches[i]].isActive) {
                activeTranches[index] = allTranches[i];
                index++;
            }
        }

        return activeTranches;
    }
}
