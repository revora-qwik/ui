// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Votes.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Permit.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
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

    // Revenue distribution tracking
    address public revenueDistributor;

    // Funding destination
    address public treasury; // Where investment funds are sent

    event Investment(
        address indexed investor,
        uint256 paymentAmount,
        uint256 tokensReceived
    );
    event FundingGoalReached(uint256 totalRaised);
    event FundingActivated();
    event FundingPaused();
    event RevenueDistributorSet(address distributor);
    event TreasurySet(address treasury);

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
    }

    /**
     * @notice Invest in the tranche by sending payment tokens
     * @param paymentAmount Amount of payment tokens to invest
     */
    function invest(uint256 paymentAmount) external nonReentrant {
        require(fundingActive, "Funding not active");
        require(!fundingComplete, "Funding already complete");
        require(paymentAmount > 0, "Amount must be > 0");

        // Calculate tokens to mint (normalized to 18 decimals)
        uint256 tokensToMint = (paymentAmount * 10 ** 18) / pricePerToken;
        require(tokensToMint > 0, "Investment too small");

        // Transfer payment tokens from investor to treasury
        require(
            paymentToken.transferFrom(msg.sender, treasury, paymentAmount),
            "Payment transfer failed"
        );

        // Mint tranche tokens to investor
        _mint(msg.sender, tokensToMint);
        totalRaised += paymentAmount;

        emit Investment(msg.sender, paymentAmount, tokensToMint);

        // Check if funding goal reached
        if (totalRaised >= fundingGoal) {
            fundingComplete = true;
            fundingActive = false;
            emit FundingGoalReached(totalRaised);
        }
    }

    /**
     * @notice Activate funding (owner only)
     */
    function activateFunding() external onlyOwner {
        require(!fundingComplete, "Funding already complete");
        fundingActive = true;
        emit FundingActivated();
    }

    /**
     * @notice Pause funding (owner only)
     */
    function pauseFunding() external onlyOwner {
        fundingActive = false;
        emit FundingPaused();
    }

    /**
     * @notice Mark funding as complete manually (owner only)
     */
    function completeFunding() external onlyOwner {
        require(!fundingComplete, "Funding already complete");
        fundingComplete = true;
        fundingActive = false;
        emit FundingGoalReached(totalRaised);
    }

    /**
     * @notice Set the revenue distributor contract address
     * @param _distributor Address of the RevenueDistributor contract
     */
    function setRevenueDistributor(address _distributor) external onlyOwner {
        require(_distributor != address(0), "Invalid distributor address");
        revenueDistributor = _distributor;
        emit RevenueDistributorSet(_distributor);
    }

    /**
     * @notice Update treasury address
     * @param _treasury New treasury address
     */
    function setTreasury(address _treasury) external onlyOwner {
        require(_treasury != address(0), "Invalid treasury address");
        treasury = _treasury;
        emit TreasurySet(_treasury);
    }

    // Override required by Solidity for multiple inheritance
    function _update(
        address from,
        address to,
        uint256 amount
    ) internal override(ERC20, ERC20Votes) {
        super._update(from, to, amount);
    }

    function nonces(
        address owner
    ) public view override(ERC20Permit, Nonces) returns (uint256) {
        return super.nonces(owner);
    }
}
