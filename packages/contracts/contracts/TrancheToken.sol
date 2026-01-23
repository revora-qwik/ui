// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Votes.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Permit.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title TrancheToken
 * @notice Investment token for a specific business tranche/round
 * @dev ERC20 token with voting/snapshot capabilities for revenue distribution claims
 *      Users can invest by sending payment tokens (USDC/USDT) to receive tranche tokens
 */
contract TrancheToken is
    ERC20,
    ERC20Votes,
    ERC20Permit,
    Ownable,
    ReentrancyGuard
{
    using SafeERC20 for IERC20;

    // Tranche lifecycle status
    enum TrancheStatus {
        Active,          // Normal operation - can invest, transfers allowed
        ClosedSuccess,   // Project successful, closed permanently
        ClosedCancelled  // Project cancelled, refunds enabled
    }

    // Metadata
    string public projectDescription;
    uint256 public fundingGoal;
    uint256 public pricePerToken; // Price in payment token (e.g., USDC with 6 decimals)

    // Payment configuration
    IERC20 public paymentToken; // USDC, USDT, or other stablecoin
    uint8 public paymentTokenDecimals;

    // Status
    bool public fundingActive;
    bool public fundingComplete;
    uint256 public totalRaised; // Total raised in payment token
    TrancheStatus public trancheStatus;

    // Refund tracking (for cancelled tranches)
    uint256 public refundPool; // Total funds available for refunds
    uint256 public refundSnapshotSupply; // Snapshot of totalSupply at cancellation
    mapping(address => bool) public hasClaimedRefund;
    uint256 public totalRefundsClaimed;

    // Revenue distribution tracking
    address public revenueDistributor;

    // Funding destination
    address public treasury; // Where investment funds are sent

    event Investment(
        address indexed investor,
        uint256 paymentAmount,
        uint256 tokensReceived,
        uint256 totalRaised
    );
    event FundingGoalReached(uint256 totalRaised, bool autoCompleted);
    event FundingActivated(address indexed activatedBy);
    event FundingPaused(address indexed pausedBy);
    event FundingManuallyCompleted(
        address indexed completedBy,
        uint256 totalRaised
    );
    event RevenueDistributorSet(
        address indexed oldDistributor,
        address indexed newDistributor
    );
    event TrancheMarkedSuccessful(
        address indexed markedBy,
        uint256 timestamp,
        uint256 finalTotalSupply
    );
    event TrancheMarkedCancelled(
        address indexed markedBy,
        uint256 timestamp,
        uint256 totalSupplySnapshot
    );
    event RefundDeposited(
        address indexed depositor,
        uint256 amount,
        uint256 newPoolTotal
    );
    event RefundClaimed(
        address indexed investor,
        uint256 refundAmount,
        uint256 tokensBurned
    );

    constructor(
        string memory name,
        string memory symbol,
        string memory _projectDescription,
        uint256 _fundingGoal,
        uint256 _pricePerToken,
        address _paymentToken,
        uint8 _paymentTokenDecimals,
        address _treasury,
        address initialOwner
    ) ERC20(name, symbol) ERC20Permit(name) Ownable(initialOwner) {
        require(_paymentToken != address(0), "Invalid payment token");
        require(_treasury != address(0), "Invalid treasury address");
        require(_fundingGoal > 0, "Funding goal must be > 0");
        require(_pricePerToken > 0, "Price must be > 0");

        projectDescription = _projectDescription;
        fundingGoal = _fundingGoal;
        pricePerToken = _pricePerToken;
        paymentToken = IERC20(_paymentToken);
        paymentTokenDecimals = _paymentTokenDecimals;
        treasury = _treasury;
        fundingActive = true;
        trancheStatus = TrancheStatus.Active;
    }

    /**
     * @notice Invest in the tranche by sending payment tokens
     * @param paymentAmount Amount of payment tokens to invest
     */
    function invest(uint256 paymentAmount) external nonReentrant {
        require(fundingActive, "Funding not active");
        require(!fundingComplete, "Funding already complete");
        require(paymentAmount > 0, "Amount must be > 0");
        require(msg.sender != owner(), "Owner cannot invest");

        // Calculate remaining amount to reach goal
        uint256 remainingToGoal = fundingGoal - totalRaised;
        require(remainingToGoal > 0, "Funding goal already reached");

        // Cap investment at remaining amount
        uint256 actualInvestment = paymentAmount > remainingToGoal ? remainingToGoal : paymentAmount;

        // Calculate tokens to mint (normalized to 18 decimals)
        uint256 tokensToMint = (actualInvestment * 10 ** 18) / pricePerToken;
        require(tokensToMint > 0, "Investment too small");

        // Transfer payment tokens from investor to treasury (only the actual amount)
        paymentToken.safeTransferFrom(msg.sender, treasury, actualInvestment);

        // Mint tranche tokens to investor
        _mint(msg.sender, tokensToMint);
        totalRaised += actualInvestment;

        emit Investment(msg.sender, actualInvestment, tokensToMint, totalRaised);

        // Check if funding goal reached
        if (totalRaised >= fundingGoal) {
            fundingComplete = true;
            fundingActive = false;
            emit FundingGoalReached(totalRaised, true); // autoCompleted = true
        }
    }

    /**
     * @notice Activate funding (owner only)
     */
    function activateFunding() external onlyOwner {
        require(!fundingComplete, "Funding already complete");
        fundingActive = true;
        emit FundingActivated(msg.sender);
    }

    /**
     * @notice Pause funding (owner only)
     */
    function pauseFunding() external onlyOwner {
        fundingActive = false;
        emit FundingPaused(msg.sender);
    }

    /**
     * @notice Mark funding as complete manually (owner only)
     */
    function completeFunding() external onlyOwner {
        require(!fundingComplete, "Funding already complete");
        fundingComplete = true;
        fundingActive = false;
        emit FundingManuallyCompleted(msg.sender, totalRaised);
    }

    /**
     * @notice Set the revenue distributor contract address
     * @param _distributor Address of the RevenueDistributor contract
     */
    function setRevenueDistributor(address _distributor) external onlyOwner {
        require(_distributor != address(0), "Invalid distributor address");
        address oldDistributor = revenueDistributor;
        revenueDistributor = _distributor;
        emit RevenueDistributorSet(oldDistributor, _distributor);
    }

    /**
     * @notice Mark tranche as successfully completed (owner only)
     * @dev Freezes token transfers permanently, allows continued distributions
     *      This is IRREVERSIBLE
     */
    function markAsSuccessful() external onlyOwner {
        require(
            trancheStatus == TrancheStatus.Active,
            "Tranche already closed"
        );
        require(fundingComplete, "Funding not complete");

        trancheStatus = TrancheStatus.ClosedSuccess;
        uint256 finalSupply = totalSupply();

        emit TrancheMarkedSuccessful(msg.sender, block.timestamp, finalSupply);
    }

    /**
     * @notice Mark tranche as cancelled/failed, enabling refunds (owner only)
     * @dev Freezes token transfers, enables refund mechanism
     *      Owner must deposit refund funds separately via depositRefundFunds()
     *      This is IRREVERSIBLE
     */
    function markAsCancelled() external onlyOwner {
        require(
            trancheStatus == TrancheStatus.Active,
            "Tranche already closed"
        );

        trancheStatus = TrancheStatus.ClosedCancelled;
        fundingActive = false;
        refundSnapshotSupply = totalSupply();

        emit TrancheMarkedCancelled(msg.sender, block.timestamp, refundSnapshotSupply);
    }

    /**
     * @notice Owner deposits funds into refund pool (owner only)
     * @dev Can only deposit after cancellation
     *      Allows multiple deposits to build up refund pool
     * @param amount Amount of payment tokens to deposit
     */
    function depositRefundFunds(uint256 amount) external onlyOwner nonReentrant {
        require(
            trancheStatus == TrancheStatus.ClosedCancelled,
            "Tranche not cancelled"
        );
        require(amount > 0, "Amount must be > 0");

        // Transfer payment tokens from owner to this contract
        paymentToken.safeTransferFrom(msg.sender, address(this), amount);

        refundPool += amount;

        emit RefundDeposited(msg.sender, amount, refundPool);
    }

    /**
     * @notice Investors claim proportional refund based on token holdings
     * @dev Calculates: (userBalance * refundPool) / refundSnapshotSupply
     *      Burns user's tokens after claiming to prevent double-claims
     */
    function claimRefund() external nonReentrant {
        require(
            trancheStatus == TrancheStatus.ClosedCancelled,
            "Refunds not enabled"
        );
        require(!hasClaimedRefund[msg.sender], "Already claimed");
        require(refundPool > 0, "No refund pool");

        uint256 userBalance = balanceOf(msg.sender);
        require(userBalance > 0, "No tokens to refund");
        require(refundSnapshotSupply > 0, "No supply snapshot");

        // Calculate proportional refund
        uint256 refundAmount = (userBalance * refundPool) /
            refundSnapshotSupply;
        require(refundAmount > 0, "Refund too small");

        // Mark as claimed BEFORE transfer (CEI pattern)
        hasClaimedRefund[msg.sender] = true;
        totalRefundsClaimed += refundAmount;

        // Burn tokens to prevent re-claiming
        _burn(msg.sender, userBalance);

        // Transfer refund
        paymentToken.safeTransfer(msg.sender, refundAmount);

        emit RefundClaimed(msg.sender, refundAmount, userBalance);
    }

    /**
     * @notice Calculate refund amount for a user (view function)
     * @param user Address to check
     * @return refundAmount Amount user can claim
     */
    function getRefundAmount(address user) external view returns (uint256) {
        if (trancheStatus != TrancheStatus.ClosedCancelled) return 0;
        if (hasClaimedRefund[user]) return 0;
        if (refundPool == 0) return 0;
        if (refundSnapshotSupply == 0) return 0;

        uint256 userBalance = balanceOf(user);
        if (userBalance == 0) return 0;

        return (userBalance * refundPool) / refundSnapshotSupply;
    }

    /**
     * @notice Check if refunds are available
     * @return available True if refunds can be claimed
     */
    function isRefundAvailable() external view returns (bool) {
        return
            trancheStatus == TrancheStatus.ClosedCancelled && refundPool > 0;
    }

    // Override required by Solidity for multiple inheritance
    function _update(
        address from,
        address to,
        uint256 amount
    ) internal override(ERC20, ERC20Votes) {
        // Allow minting (from == address(0))
        // Allow burning (to == address(0)) - needed for refunds
        // Block regular transfers when closed
        if (from != address(0) && to != address(0)) {
            require(
                trancheStatus == TrancheStatus.Active,
                "Transfers frozen - tranche closed"
            );
        }

        super._update(from, to, amount);

        // Auto-delegate to self when receiving first tokens (minting or first transfer)
        // This ensures users can participate in revenue distributions without manual delegation
        if (to != address(0) && delegates(to) == address(0)) {
            _delegate(to, to);
        }
    }

    function nonces(
        address owner
    ) public view override(ERC20Permit, Nonces) returns (uint256) {
        return super.nonces(owner);
    }
}
