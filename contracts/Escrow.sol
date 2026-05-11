// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IERC20 {
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    function transfer(address to, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
}

contract Escrow {
    IERC20 public usdc;

    enum Status { Empty, Funded, Completed, Refunded }

    struct Deal {
        address client;
        address freelancer;
        uint256 amount;
        Status status;
        string description;
    }

    uint256 public nextDealId;
    mapping(uint256 => Deal) public deals;

    event DealCreated(uint256 indexed dealId, address indexed client, address indexed freelancer, uint256 amount, string description);
    event DealFunded(uint256 indexed dealId);
    event DealCompleted(uint256 indexed dealId, uint256 amount);
    event DealRefunded(uint256 indexed dealId, uint256 amount);

    constructor(address _usdc) {
        usdc = IERC20(_usdc);
    }

    /// @notice Create a new escrow deal (client only)
    /// @param _freelancer Address of the freelancer
    /// @param _amount USDC amount (6 decimals)
    /// @param _description What the freelancer needs to deliver
    function createDeal(address _freelancer, uint256 _amount, string calldata _description) external {
        require(_freelancer != address(0), "Invalid freelancer");
        require(_freelancer != msg.sender, "Cannot escrow with yourself");
        require(_amount > 0, "Amount must be > 0");

        uint256 dealId = nextDealId++;
        deals[dealId] = Deal({
            client: msg.sender,
            freelancer: _freelancer,
            amount: _amount,
            status: Status.Empty,
            description: _description
        });

        emit DealCreated(dealId, msg.sender, _freelancer, _amount, _description);
    }

    /// @notice Client funds the escrow with USDC
    function fundDeal(uint256 _dealId) external {
        Deal storage deal = deals[_dealId];
        require(deal.client == msg.sender, "Not client");
        require(deal.status == Status.Empty, "Already funded");

        require(usdc.transferFrom(msg.sender, address(this), deal.amount), "Transfer failed");
        deal.status = Status.Funded;

        emit DealFunded(_dealId);
    }

    /// @notice Client approves and releases USDC to freelancer
    function approveDeal(uint256 _dealId) external {
        Deal storage deal = deals[_dealId];
        require(deal.client == msg.sender, "Not client");
        require(deal.status == Status.Funded, "Not funded");

        deal.status = Status.Completed;
        require(usdc.transfer(deal.freelancer, deal.amount), "Transfer failed");

        emit DealCompleted(_dealId, deal.amount);
    }

    /// @notice Client refunds themselves (before approval)
    function refundDeal(uint256 _dealId) external {
        Deal storage deal = deals[_dealId];
        require(deal.client == msg.sender, "Not client");
        require(deal.status == Status.Funded, "Not funded");

        deal.status = Status.Refunded;
        require(usdc.transfer(deal.client, deal.amount), "Transfer failed");

        emit DealRefunded(_dealId, deal.amount);
    }

    /// @notice Get deal details
    function getDeal(uint256 _dealId) external view returns (
        address client,
        address freelancer,
        uint256 amount,
        Status status,
        string memory description
    ) {
        Deal memory deal = deals[_dealId];
        return (deal.client, deal.freelancer, deal.amount, deal.status, deal.description);
    }

    /// @notice Get total number of deals
    function totalDeals() external view returns (uint256) {
        return nextDealId;
    }
}
