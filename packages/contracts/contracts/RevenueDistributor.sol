// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Votes.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title RevenueDistributor
 * @notice Distributes revenue from tranches to token holders based on snapshots
 * @dev Supports dynamic split between tranche token holders and Revora token holders
 *      If no Revora token is set, Revora share goes to treasury address
 */
contract RevenueDistributor is Ownable, ReentrancyGuard {
    struct Distribution {
        address trancheToken;
        address paymentToken;
        uint256 totalAmount;
        uint256 trancheAmount;
        uint256 revoraAmount;
        uint48 snapshotBlock;
        uint48 timestamp;
        uint48 claimDeadline; // After this, unclaimed funds can be withdrawn
        uint256 trancheTotalSupply;
        uint256 revoraTotalSupply;
        uint256 totalClaimed;
    }

    struct TrancheConfig {
        uint16 revoraShareBps; // Basis points (100 = 1%, 10000 = 100%)
        uint32 minInvestmentPeriodDays; // For time-based adjustments
        uint16 timeBasedBonusBps; // Additional % if investment period met
        uint256 performanceThreshold; // Profit threshold for performance bonus
        uint16 performanceBonusBps; // Additional % if performance threshold met
        uint32 claimPeriodDays; // How long users have to claim
        bool isConfigured;
    }

    // Revora token (optional)
    ERC20Votes public revoraToken;

    // Treasury address for Revora share (if no token) and unclaimed funds
    address public revoraTreasury;

    // Authorized configurers (e.g., TrancheFactory)
    mapping(address => bool) public authorizedConfigurers;

    // Distribution tracking
    mapping(uint256 => Distribution) public distributions;
    uint256 public distributionCount;

    // Tranche configurations
    mapping(address => TrancheConfig) public trancheConfigs;

    // Claim tracking: distributionId => user => claimed
    mapping(uint256 => mapping(address => bool)) public hasClaimed;

    event DistributionCreated(
        uint256 indexed distributionId,
        address indexed trancheToken,
        address paymentToken,
        uint256 totalAmount,
        uint256 trancheAmount,
        uint256 revoraAmount,
        uint48 snapshotBlock,
        uint48 claimDeadline
    );

    event Claimed(
        uint256 indexed distributionId,
        address indexed user,
        uint256 amount
    );

    event UnclaimedFundsWithdrawn(
        uint256 indexed distributionId,
        uint256 amount,
        address recipient
    );

    event TrancheConfigured(
        address indexed trancheToken,
        uint16 revoraShareBps,
        uint32 minInvestmentPeriodDays,
        uint16 timeBasedBonusBps,
        uint256 performanceThreshold,
        uint16 performanceBonusBps,
        uint32 claimPeriodDays
    );

    event RevoraTokenSet(address indexed revoraToken);
    event RevoraTreasurySet(address indexed treasury);
    event ConfigurerAuthorized(address indexed configurer);
    event ConfigurerRevoked(address indexed configurer);

    constructor(
        address _revoraTreasury,
        address initialOwner
    ) Ownable(initialOwner) {
        require(_revoraTreasury != address(0), "Invalid treasury address");
        revoraTreasury = _revoraTreasury;
    }

    /**
     * @notice Set the Revora token address (can be set later when token is created)
     * @param _revoraToken Address of Revora token
     */
    function setRevoraToken(address _revoraToken) external onlyOwner {
        require(_revoraToken != address(0), "Invalid token address");
        revoraToken = ERC20Votes(_revoraToken);
        emit RevoraTokenSet(_revoraToken);
    }

    /**
     * @notice Update treasury address for Revora share
     * @param _treasury New treasury address
     */
    function setRevoraTreasury(address _treasury) external onlyOwner {
        require(_treasury != address(0), "Invalid treasury address");
        revoraTreasury = _treasury;
        emit RevoraTreasurySet(_treasury);
    }

    /**
     * @notice Authorize an address to configure tranches (e.g., TrancheFactory)
     * @param configurer Address to authorize
     */
    function authorizeConfigurer(address configurer) external onlyOwner {
        require(configurer != address(0), "Invalid configurer address");
        authorizedConfigurers[configurer] = true;
        emit ConfigurerAuthorized(configurer);
    }

    /**
     * @notice Revoke authorization for an address
     * @param configurer Address to revoke
     */
    function revokeConfigurer(address configurer) external onlyOwner {
        authorizedConfigurers[configurer] = false;
        emit ConfigurerRevoked(configurer);
    }

    /**
     * @notice Configure revenue split parameters for a tranche
     * @param trancheToken Address of the tranche token
     * @param revoraShareBps Base Revora share in basis points (e.g., 1000 = 10%)
     * @param minInvestmentPeriodDays Minimum days for time bonus
     * @param timeBasedBonusBps Additional bonus if period met
     * @param performanceThreshold Profit threshold for performance bonus
     * @param performanceBonusBps Additional bonus if threshold met
     * @param claimPeriodDays Number of days users have to claim before funds can be withdrawn
     */
    function configureTranche(
        address trancheToken,
        uint16 revoraShareBps,
        uint32 minInvestmentPeriodDays,
        uint16 timeBasedBonusBps,
        uint256 performanceThreshold,
        uint16 performanceBonusBps,
        uint32 claimPeriodDays
    ) external {
        require(
            msg.sender == owner() || authorizedConfigurers[msg.sender],
            "Not authorized"
        );
        require(trancheToken != address(0), "Invalid tranche address");
        require(revoraShareBps <= 10000, "Invalid share");
        require(timeBasedBonusBps <= 10000, "Invalid time bonus");
        require(performanceBonusBps <= 10000, "Invalid performance bonus");
        require(claimPeriodDays > 0, "Claim period must be > 0");

        trancheConfigs[trancheToken] = TrancheConfig({
            revoraShareBps: revoraShareBps,
            minInvestmentPeriodDays: minInvestmentPeriodDays,
            timeBasedBonusBps: timeBasedBonusBps,
            performanceThreshold: performanceThreshold,
            performanceBonusBps: performanceBonusBps,
            claimPeriodDays: claimPeriodDays,
            isConfigured: true
        });

        emit TrancheConfigured(
            trancheToken,
            revoraShareBps,
            minInvestmentPeriodDays,
            timeBasedBonusBps,
            performanceThreshold,
            performanceBonusBps,
            claimPeriodDays
        );
    }

    /**
     * @notice Create a new distribution by depositing revenue
     * @param trancheToken Address of the tranche token
     * @param paymentToken Address of the payment token (revenue token)
     * @param totalAmount Total revenue amount to distribute
     * @param profitAmount Actual profit amount (for performance calculation)
     * @param investmentStartBlock Block when investment started (for time calculation)
     */
    function createDistribution(
        address trancheToken,
        address paymentToken,
        uint256 totalAmount,
        uint256 profitAmount,
        uint256 investmentStartBlock
    ) external onlyOwner nonReentrant returns (uint256) {
        require(trancheToken != address(0), "Invalid tranche");
        require(paymentToken != address(0), "Invalid payment token");
        require(totalAmount > 0, "Amount must be > 0");

        TrancheConfig memory config = trancheConfigs[trancheToken];
        require(config.isConfigured, "Tranche not configured");

        // Calculate effective Revora share with bonuses
        uint16 effectiveRevoraShareBps = config.revoraShareBps;

        // Time-based bonus
        if (
            config.minInvestmentPeriodDays > 0 && config.timeBasedBonusBps > 0
        ) {
            uint256 daysSinceInvestment = ((block.number -
                investmentStartBlock) * 12) / 86400; // Assuming 12s blocks
            if (daysSinceInvestment >= config.minInvestmentPeriodDays) {
                effectiveRevoraShareBps += config.timeBasedBonusBps;
            }
        }

        // Performance-based bonus
        if (config.performanceThreshold > 0 && config.performanceBonusBps > 0) {
            if (profitAmount >= config.performanceThreshold) {
                effectiveRevoraShareBps += config.performanceBonusBps;
            }
        }

        // Cap at 100%
        if (effectiveRevoraShareBps > 10000) {
            effectiveRevoraShareBps = 10000;
        }

        // Calculate split
        uint256 revoraAmount = (totalAmount * effectiveRevoraShareBps) / 10000;
        uint256 trancheAmount = totalAmount - revoraAmount;

        // Get snapshot data
        ERC20Votes tranche = ERC20Votes(trancheToken);
        uint48 snapshotBlock = uint48(block.number - 1);
        uint256 trancheTotalSupply = tranche.getPastTotalSupply(snapshotBlock);

        uint256 revoraTotalSupply = 0;
        if (address(revoraToken) != address(0) && revoraAmount > 0) {
            revoraTotalSupply = revoraToken.getPastTotalSupply(snapshotBlock);
        }

        // Calculate claim deadline
        uint48 claimDeadline = uint48(
            block.timestamp + (config.claimPeriodDays * 1 days)
        );

        // Transfer payment tokens from sender
        require(
            IERC20(paymentToken).transferFrom(
                msg.sender,
                address(this),
                totalAmount
            ),
            "Transfer failed"
        );

        // If no Revora token, send Revora share to treasury immediately
        if (address(revoraToken) == address(0) && revoraAmount > 0) {
            require(
                IERC20(paymentToken).transfer(revoraTreasury, revoraAmount),
                "Treasury transfer failed"
            );
        }

        // Create distribution record
        uint256 distributionId = distributionCount++;
        distributions[distributionId] = Distribution({
            trancheToken: trancheToken,
            paymentToken: paymentToken,
            totalAmount: totalAmount,
            trancheAmount: trancheAmount,
            revoraAmount: revoraAmount,
            snapshotBlock: snapshotBlock,
            timestamp: uint48(block.timestamp),
            claimDeadline: claimDeadline,
            trancheTotalSupply: trancheTotalSupply,
            revoraTotalSupply: revoraTotalSupply,
            totalClaimed: 0
        });

        emit DistributionCreated(
            distributionId,
            trancheToken,
            paymentToken,
            totalAmount,
            trancheAmount,
            revoraAmount,
            snapshotBlock,
            claimDeadline
        );

        return distributionId;
    }

    /**
     * @notice Internal function to calculate claimable amount for a user
     * @param distributionId ID of the distribution
     * @param user Address of the user
     * @return claimable Amount the user can claim
     */
    function _calculateClaimable(
        uint256 distributionId,
        address user
    ) internal view returns (uint256) {
        Distribution memory dist = distributions[distributionId];
        uint256 totalClaimable = 0;

        // Tranche token share
        if (dist.trancheAmount > 0 && dist.trancheTotalSupply > 0) {
            ERC20Votes tranche = ERC20Votes(dist.trancheToken);
            uint256 userTrancheBalance = tranche.getPastVotes(
                user,
                dist.snapshotBlock
            );

            if (userTrancheBalance > 0) {
                uint256 trancheShare = (dist.trancheAmount *
                    userTrancheBalance) / dist.trancheTotalSupply;
                totalClaimable += trancheShare;
            }
        }

        // Revora token share (only if token exists)
        if (
            address(revoraToken) != address(0) &&
            dist.revoraAmount > 0 &&
            dist.revoraTotalSupply > 0
        ) {
            uint256 userRevoraBalance = revoraToken.getPastVotes(
                user,
                dist.snapshotBlock
            );

            if (userRevoraBalance > 0) {
                uint256 revoraShare = (dist.revoraAmount * userRevoraBalance) /
                    dist.revoraTotalSupply;
                totalClaimable += revoraShare;
            }
        }

        return totalClaimable;
    }

    /**
     * @notice Claim revenue share from a distribution
     * @param distributionId ID of the distribution to claim from
     */
    function claim(uint256 distributionId) external nonReentrant {
        require(distributionId < distributionCount, "Invalid distribution");
        require(!hasClaimed[distributionId][msg.sender], "Already claimed");
        require(
            block.timestamp <= distributions[distributionId].claimDeadline,
            "Claim period ended"
        );

        uint256 claimable = _calculateClaimable(distributionId, msg.sender);
        require(claimable > 0, "Nothing to claim");

        // Mark as claimed
        hasClaimed[distributionId][msg.sender] = true;
        distributions[distributionId].totalClaimed += claimable;

        // Transfer tokens
        require(
            IERC20(distributions[distributionId].paymentToken).transfer(
                msg.sender,
                claimable
            ),
            "Claim transfer failed"
        );

        emit Claimed(distributionId, msg.sender, claimable);
    }

    /**
     * @notice Get claimable amount for a user from a specific distribution
     * @param distributionId ID of the distribution
     * @param user Address of the user
     * @return claimable Amount the user can claim
     */
    function getClaimableAmount(
        uint256 distributionId,
        address user
    ) external view returns (uint256) {
        if (distributionId >= distributionCount) return 0;
        if (hasClaimed[distributionId][user]) return 0;
        if (block.timestamp > distributions[distributionId].claimDeadline)
            return 0;

        return _calculateClaimable(distributionId, user);
    }

    /**
     * @notice Withdraw unclaimed funds after claim deadline
     * @param distributionId Distribution to withdraw from
     */
    function withdrawUnclaimedFunds(
        uint256 distributionId
    ) external onlyOwner nonReentrant {
        require(distributionId < distributionCount, "Invalid distribution");
        Distribution memory dist = distributions[distributionId];
        require(block.timestamp > dist.claimDeadline, "Claim period not ended");

        uint256 unclaimed = dist.totalAmount - dist.totalClaimed;
        require(unclaimed > 0, "No unclaimed funds");

        // Update distribution
        distributions[distributionId].totalClaimed = dist.totalAmount;

        // Transfer unclaimed funds to treasury
        require(
            IERC20(dist.paymentToken).transfer(revoraTreasury, unclaimed),
            "Withdraw failed"
        );

        emit UnclaimedFundsWithdrawn(distributionId, unclaimed, revoraTreasury);
    }
}
