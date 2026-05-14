// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IERC20 {
    function transfer(address to, uint256 amount) external returns (bool);
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
}

contract BondRoomV22 {
    // ─── State ───
    address public owner;
    IERC20 public usdc;
    address public treasury;
    address public arbiter;
    string public arbiterName;

    uint256 public roomCount;
    mapping(uint256 => Room) public rooms;
    mapping(address => uint256) public activeRooms;

    // Evidence
    struct Evidence {
        address submitter;
        string evidenceType;
        string description;
        string evidenceRef;
        uint256 timestamp;
    }
    mapping(uint256 => Evidence[]) public roomEvidence;

    // Mutual Cancel
    mapping(uint256 => mapping(address => bool)) public mutualCancelApproved;

    // Reputation
    mapping(address => uint256) public successCount;
    mapping(address => uint256) public disputeCount;
    mapping(address => uint256) public refundedCount;

    // ─── Constants ───
    uint256 public constant FUND_TAX_BPS = 100;        // 1%
    uint256 public constant ARBITER_FEE_BPS = 500;     // 5%
    uint256 public constant BPS_DENOM = 10000;
    uint256 public constant MAX_ACTIVE = 3;
    uint256 public constant JOIN_DL = 1 days;
    uint256 public constant FUND_DL = 30 minutes;
    uint256 public constant MIN_DELIVERY_DAYS = 1;
    uint256 public constant MAX_DELIVERY_DAYS = 90;

    // Confirm windows by deal type (in seconds)
    uint256 public constant CONFIRM_INSTANT = 1 days;
    uint256 public constant CONFIRM_EVENT = 30 days;
    uint256 public constant CONFIRM_SERVICE = 7 days;

    // ─── Enums ───
    enum State {
        Created,    // 0
        Joined,     // 1
        Funded,     // 2
        Delivered,  // 3
        Released,   // 4
        Disputed,   // 5
        Refunded,   // 6
        Expired,    // 7
        Cancelled   // 8
    }

    enum DealType {
        Instant,     // 0 - Discord, accounts, immediate goods
        EventBased,  // 1 - WL, NFT, mint-related
        Service      // 2 - Design, dev work
    }

    // ─── Structs ───
    struct Room {
        address creator;
        address counterparty;
        bool creatorIsSeller;
        string itemDescription;
        uint256 priceUSD;
        uint256 collateralAmount;
        uint32 createdAt;
        uint32 joinedAt;
        uint32 deliveredAt;
        uint32 disputedAt;
        uint32 deliveryDeadline;
        uint32 confirmDeadline;
        State state;
        DealType dealType;
        uint256 fundedAmount;
        uint256 platformFee;
        bytes32 deliveryProofHash;
        bytes32 joinCodeHash;
    }

    // ─── Events ───
    event RoomCreated(
        uint256 indexed id,
        address indexed creator,
        string item,
        uint256 price,
        uint256 collateral,
        bool creatorIsSeller,
        uint32 deliveryDeadline,
        DealType dealType
    );
    event RoomJoined(uint256 indexed id, address indexed who);
    event RoomFunded(uint256 indexed id, uint256 amount, uint256 fee);
    event RoomDelivered(uint256 indexed id, bytes32 proof);
    event RoomReleased(uint256 indexed id, uint256 amount, uint256 collateral);
    event RoomDisputed(uint256 indexed id, string reason);
    event RoomRefunded(uint256 indexed id, uint256 amount, uint256 collateral);
    event RoomExpired(uint256 indexed id);
    event RoomCancelled(uint256 indexed id, address indexed by);
    event DisputeResolved(uint256 indexed id, address indexed winner, uint256 amount);
    event MutualCancelRequested(uint256 indexed id, address indexed by);
    event MutualCancelExecuted(uint256 indexed id);
    event MutualCancelRevoked(uint256 indexed id, address indexed by);
    event EvidenceSubmitted(
        uint256 indexed roomId,
        address indexed submitter,
        string evidenceType,
        string description,
        string evidenceRef
    );
    event EscalatedNoResponse(uint256 indexed id, uint32 confirmDeadline);

    // ─── Modifiers ───
    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner");
        _;
    }

    modifier onlyOwnerOrArbiter() {
        require(msg.sender == owner || msg.sender == arbiter, "Not authorized");
        _;
    }

    // ─── Constructor ───
    constructor(
        address _usdc,
        address _treasury,
        address _arbiter,
        string memory _arbiterName
    ) {
        owner = msg.sender;
        usdc = IERC20(_usdc);
        treasury = _treasury;
        arbiter = _arbiter;
        arbiterName = _arbiterName;
    }

    // ─── Admin ───
    function setTreasury(address _t) external onlyOwner {
        treasury = _t;
    }

    function setArbiter(address _a, string memory _name) external onlyOwner {
        arbiter = _a;
        arbiterName = _name;
    }

    function transferOwnership(address _new) external onlyOwner {
        owner = _new;
    }

    // ─── Helpers ───
    function _seller(Room storage r) internal view returns (address) {
        return r.creatorIsSeller ? r.creator : r.counterparty;
    }

    function _buyer(Room storage r) internal view returns (address) {
        return r.creatorIsSeller ? r.counterparty : r.creator;
    }

    function _isParticipant(Room storage r) internal view returns (bool) {
        return msg.sender == r.creator || msg.sender == r.counterparty;
    }

    function _clearMutualCancelApprovals(uint256 _roomId, address _creator, address _counterparty) internal {
        mutualCancelApproved[_roomId][_creator] = false;
        if (_counterparty != address(0)) {
            mutualCancelApproved[_roomId][_counterparty] = false;
        }
    }

    function _confirmWindow(DealType _dt) internal pure returns (uint256) {
        if (_dt == DealType.Instant) return CONFIRM_INSTANT;
        if (_dt == DealType.EventBased) return CONFIRM_EVENT;
        return CONFIRM_SERVICE;
    }

    // ─── Reputation ───
    function collateralMultiplier(address _seller) external view returns (uint256) {
        if (refundedCount[_seller] > 0) return 150;
        if (successCount[_seller] >= 10) return 50;
        if (successCount[_seller] >= 3) return 75;
        return 100;
    }

    // ─── Create Room ───
    function createRoom(
        string calldata _item,
        uint256 _price,
        uint256 _collateral,
        bytes32 _joinCodeHash,
        bool _creatorIsSeller,
        uint32 _deliveryDays,
        DealType _dealType
    ) external {
        require(bytes(_item).length > 0, "Empty item");
        require(_price > 0, "Zero price");
        require(_deliveryDays >= MIN_DELIVERY_DAYS && _deliveryDays <= MAX_DELIVERY_DAYS, "Bad deliveryDays");
        require(activeRooms[msg.sender] < MAX_ACTIVE, "Max active rooms reached");

        uint256 id = ++roomCount;
        uint32 now32 = uint32(block.timestamp);

        rooms[id] = Room({
            creator: msg.sender,
            counterparty: address(0),
            creatorIsSeller: _creatorIsSeller,
            itemDescription: _item,
            priceUSD: _price,
            collateralAmount: _collateral,
            createdAt: now32,
            joinedAt: 0,
            deliveredAt: 0,
            disputedAt: 0,
            deliveryDeadline: now32 + (_deliveryDays * 1 days),
            confirmDeadline: 0,
            state: State.Created,
            dealType: _dealType,
            fundedAmount: 0,
            platformFee: 0,
            deliveryProofHash: bytes32(0),
            joinCodeHash: _joinCodeHash
        });

        activeRooms[msg.sender]++;

        if (_creatorIsSeller && _collateral > 0) {
            require(
                usdc.transferFrom(msg.sender, address(this), _collateral),
                "Collateral lock failed"
            );
        }

        emit RoomCreated(
            id,
            msg.sender,
            _item,
            _price,
            _collateral,
            _creatorIsSeller,
            rooms[id].deliveryDeadline,
            _dealType
        );
    }

    // ─── Join Room ───
    function joinRoom(uint256 _roomId, bytes calldata _joinCode) external {
        Room storage r = rooms[_roomId];
        require(r.creator != address(0), "Room not found");
        require(r.state == State.Created, "Not open for join");
        require(block.timestamp <= r.createdAt + JOIN_DL, "Join window expired");
        require(msg.sender != r.creator, "Creator cannot join");
        require(r.counterparty == address(0), "Already joined");
        require(verifyJoinCode(_roomId, _joinCode), "Invalid join code");
        require(activeRooms[msg.sender] < MAX_ACTIVE, "Max active rooms reached");

        r.counterparty = msg.sender;
        r.joinedAt = uint32(block.timestamp);
        r.state = State.Joined;
        activeRooms[msg.sender]++;

        if (!r.creatorIsSeller && r.collateralAmount > 0) {
            require(
                usdc.transferFrom(msg.sender, address(this), r.collateralAmount),
                "Collateral lock failed"
            );
        }

        emit RoomJoined(_roomId, msg.sender);
    }

    // ─── Fund Room ───
    function fundRoom(uint256 _roomId) external {
        Room storage r = rooms[_roomId];
        require(r.state == State.Joined, "Not joinable");
        require(block.timestamp <= r.joinedAt + FUND_DL, "Fund window expired");

        address buyer = _buyer(r);
        require(msg.sender == buyer, "Only buyer can fund");

        uint256 fee = (r.priceUSD * FUND_TAX_BPS) / BPS_DENOM;
        uint256 net = r.priceUSD - fee;

        require(usdc.transferFrom(msg.sender, address(this), r.priceUSD), "Fund transfer failed");

        r.fundedAmount = net;
        r.platformFee = fee;
        r.state = State.Funded;

        emit RoomFunded(_roomId, r.priceUSD, fee);
    }

    // ─── Mark Delivered ───
    function markDelivered(uint256 _roomId, bytes32 _proofHash) external {
        Room storage r = rooms[_roomId];
        require(r.state == State.Funded, "Not funded");
        require(block.timestamp <= r.deliveryDeadline, "Delivery deadline passed");
        require(msg.sender == _seller(r), "Only seller");

        r.deliveryProofHash = _proofHash;
        r.deliveredAt = uint32(block.timestamp);
        r.confirmDeadline = uint32(block.timestamp + _confirmWindow(r.dealType));
        r.state = State.Delivered;

        emit RoomDelivered(_roomId, _proofHash);
    }

    // ─── Release Funds (buyer confirms) ───
    function releaseFunds(uint256 _roomId) external {
        Room storage r = rooms[_roomId];
        require(r.state == State.Delivered, "Not delivered");
        require(msg.sender == _buyer(r), "Only buyer can release");
        require(block.timestamp <= r.confirmDeadline, "Confirm window expired");

        _release(_roomId, r);
    }

    function _release(uint256 _roomId, Room storage r) internal {
        address seller = _seller(r);

        uint256 payout = r.fundedAmount + r.collateralAmount;

        if (r.platformFee > 0) {
            usdc.transfer(treasury, r.platformFee);
        }

        if (payout > 0) {
            usdc.transfer(seller, payout);
        }

        _closeRoom(_roomId, r);
        r.state = State.Released;
        successCount[seller]++;

        emit RoomReleased(_roomId, r.fundedAmount, r.collateralAmount);
    }

    // ─── Escalate No Response (seller calls when buyer ghosts) ───
    function escalateNoResponse(uint256 _roomId) external {
        Room storage r = rooms[_roomId];
        require(r.state == State.Delivered, "Not delivered");
        require(msg.sender == _seller(r), "Only seller");
        require(block.timestamp > r.confirmDeadline, "Confirm window still open");

        r.state = State.Disputed;
        r.disputedAt = uint32(block.timestamp);

        disputeCount[_seller(r)]++;
        disputeCount[_buyer(r)]++;

        emit RoomDisputed(_roomId, "Buyer did not confirm within window");
        emit EscalatedNoResponse(_roomId, r.confirmDeadline);
    }

    // ─── Dispute (with reason & evidence) ───
    function openDispute(
        uint256 _roomId,
        string calldata _reason,
        string calldata _evidenceType,
        string calldata _evidenceDesc,
        string calldata _evidenceRef
    ) external {
        Room storage r = rooms[_roomId];
        require(r.state == State.Delivered, "Not delivered");
        require(msg.sender == _buyer(r), "Only buyer can dispute");
        require(bytes(_reason).length > 0, "Reason required");

        r.state = State.Disputed;
        r.disputedAt = uint32(block.timestamp);

        disputeCount[_seller(r)]++;
        disputeCount[_buyer(r)]++;

        _submitEvidence(_roomId, _evidenceType, _evidenceDesc, _evidenceRef);

        emit RoomDisputed(_roomId, _reason);
    }

    // ─── Submit Evidence (after dispute, by either party) ───
    function submitEvidence(
        uint256 _roomId,
        string calldata _evidenceType,
        string calldata _description,
        string calldata _evidenceRef
    ) external {
        Room storage r = rooms[_roomId];
        require(r.state == State.Disputed, "Not disputed");
        require(_isParticipant(r), "Only participant can submit evidence");
        require(bytes(_evidenceRef).length > 0, "Evidence ref required");

        _submitEvidence(_roomId, _evidenceType, _description, _evidenceRef);
    }

    function _submitEvidence(
        uint256 _roomId,
        string calldata _evidenceType,
        string calldata _description,
        string calldata _evidenceRef
    ) internal {
        roomEvidence[_roomId].push(Evidence({
            submitter: msg.sender,
            evidenceType: _evidenceType,
            description: _description,
            evidenceRef: _evidenceRef,
            timestamp: block.timestamp
        }));

        emit EvidenceSubmitted(_roomId, msg.sender, _evidenceType, _description, _evidenceRef);
    }

    // ─── View Evidence ───
    function getEvidenceCount(uint256 _roomId) external view returns (uint256) {
        return roomEvidence[_roomId].length;
    }

    function getEvidence(uint256 _roomId, uint256 _index) external view returns (Evidence memory) {
        require(_index < roomEvidence[_roomId].length, "Index out of bounds");
        return roomEvidence[_roomId][_index];
    }

    function getAllEvidence(uint256 _roomId) external view returns (Evidence[] memory) {
        return roomEvidence[_roomId];
    }

    // ─── Buyer Refund (seller failed to deliver) ───
    function buyerRefund(uint256 _roomId) external {
        Room storage r = rooms[_roomId];
        require(r.state == State.Funded, "Not funded");
        require(block.timestamp > r.deliveryDeadline, "Deadline not passed");
        require(msg.sender == _buyer(r), "Only buyer");

        address buyer = _buyer(r);
        address seller = _seller(r);
        uint256 totalRefund = r.fundedAmount + r.collateralAmount;

        if (r.platformFee > 0) {
            usdc.transfer(treasury, r.platformFee);
        }

        if (totalRefund > 0) {
            usdc.transfer(buyer, totalRefund);
        }

        _closeRoom(_roomId, r);
        r.state = State.Refunded;
        refundedCount[seller]++;

        emit RoomRefunded(_roomId, r.fundedAmount, r.collateralAmount);
    }

    // ─── Arbiter Resolve ───
    function arbiterResolve(uint256 _roomId, address _winner) external onlyOwnerOrArbiter {
        Room storage r = rooms[_roomId];
        require(r.state == State.Disputed, "Not disputed");
        require(_winner == _buyer(r) || _winner == _seller(r), "Invalid winner");

        uint256 total = r.fundedAmount + r.collateralAmount;
        uint256 arbiterFee = (total * ARBITER_FEE_BPS) / BPS_DENOM;
        uint256 net = total - arbiterFee;

        if (r.platformFee > 0) usdc.transfer(treasury, r.platformFee);
        if (arbiterFee > 0) usdc.transfer(treasury, arbiterFee);

        if (net > 0) usdc.transfer(_winner, net);

        if (_winner == _seller(r)) {
            successCount[_seller(r)]++;
        } else {
            refundedCount[_seller(r)]++;
        }

        _closeRoom(_roomId, r);
        r.state = State.Released;

        emit DisputeResolved(_roomId, _winner, net);
    }

    // ─── Arbiter Split ───
    function arbiterSplit(uint256 _roomId) external onlyOwnerOrArbiter {
        Room storage r = rooms[_roomId];
        require(r.state == State.Disputed, "Not disputed");

        uint256 total = r.fundedAmount + r.collateralAmount;
        uint256 arbiterFee = (total * ARBITER_FEE_BPS) / BPS_DENOM;
        uint256 net = total - arbiterFee;
        uint256 half = net / 2;

        if (r.platformFee > 0) usdc.transfer(treasury, r.platformFee);
        if (arbiterFee > 0) usdc.transfer(treasury, arbiterFee);

        if (half > 0) {
            usdc.transfer(_buyer(r), half);
            usdc.transfer(_seller(r), net - half);
        }

        _closeRoom(_roomId, r);
        r.state = State.Released;

        emit DisputeResolved(_roomId, address(0), net);
    }

    // ─── Cancel Room (creator, before join) ───
    function cancelRoom(uint256 _roomId) external {
        Room storage r = rooms[_roomId];
        require(r.creator == msg.sender, "Only creator");
        require(r.state == State.Created, "Not cancellable");

        if (r.creatorIsSeller && r.collateralAmount > 0) {
            usdc.transfer(r.creator, r.collateralAmount);
        }

        _clearMutualCancelApprovals(_roomId, r.creator, r.counterparty);
        _closeRoom(_roomId, r);
        r.state = State.Cancelled;

        emit RoomCancelled(_roomId, msg.sender);
    }

    // ─── Expire Room (anyone, after deadline) ───
    function expireRoom(uint256 _roomId) external {
        Room storage r = rooms[_roomId];
        require(
            r.state == State.Created || r.state == State.Joined,
            "Not expirable"
        );

        if (r.state == State.Created) {
            require(block.timestamp > r.createdAt + JOIN_DL, "Not expired");
        } else {
            require(block.timestamp > r.joinedAt + FUND_DL, "Not expired");
        }

        if (r.creatorIsSeller && r.collateralAmount > 0) {
            usdc.transfer(r.creator, r.collateralAmount);
        } else if (!r.creatorIsSeller && r.collateralAmount > 0) {
            usdc.transfer(r.counterparty, r.collateralAmount);
        }

        _clearMutualCancelApprovals(_roomId, r.creator, r.counterparty);
        _closeRoom(_roomId, r);
        r.state = State.Expired;

        emit RoomExpired(_roomId);
    }

    // ─── Mutual Cancel Request ───
    function requestMutualCancel(uint256 _roomId) external {
        Room storage r = rooms[_roomId];
        require(_isParticipant(r), "Only participant");
        require(
            r.state == State.Joined || r.state == State.Funded || r.state == State.Delivered,
            "Not cancellable"
        );
        require(!mutualCancelApproved[_roomId][msg.sender], "Already requested");

        mutualCancelApproved[_roomId][msg.sender] = true;
        emit MutualCancelRequested(_roomId, msg.sender);
    }

    // ─── Mutual Cancel Revoke ───
    function revokeMutualCancel(uint256 _roomId) external {
        Room storage r = rooms[_roomId];
        require(_isParticipant(r), "Only participant");
        require(mutualCancelApproved[_roomId][msg.sender], "Not requested");

        mutualCancelApproved[_roomId][msg.sender] = false;
        emit MutualCancelRevoked(_roomId, msg.sender);
    }

    // ─── Mutual Cancel Execute ───
    function executeMutualCancel(uint256 _roomId) external {
        Room storage r = rooms[_roomId];
        require(
            r.state == State.Joined || r.state == State.Funded || r.state == State.Delivered,
            "Not cancellable"
        );
        require(
            mutualCancelApproved[_roomId][r.creator] && mutualCancelApproved[_roomId][r.counterparty],
            "Both must approve"
        );

        address buyer = _buyer(r);
        address seller = _seller(r);

        if (r.fundedAmount + r.collateralAmount > 0) {
            usdc.transfer(buyer, r.fundedAmount);
            if (r.collateralAmount > 0) {
                usdc.transfer(seller, r.collateralAmount);
            }
        }

        if (r.platformFee > 0) {
            usdc.transfer(treasury, r.platformFee);
        }

        _clearMutualCancelApprovals(_roomId, r.creator, r.counterparty);
        _closeRoom(_roomId, r);
        r.state = State.Cancelled;

        emit MutualCancelExecuted(_roomId);
    }

    // ─── Verify Join Code ───
    function verifyJoinCode(uint256 _roomId, bytes calldata _code) public view returns (bool) {
        return keccak256(_code) == rooms[_roomId].joinCodeHash;
    }

    // ─── Close Room ───
    function _closeRoom(uint256 _roomId, Room storage r) internal {
        if (r.creator != address(0)) {
            if (activeRooms[r.creator] > 0) activeRooms[r.creator]--;
        }
        if (r.counterparty != address(0)) {
            if (activeRooms[r.counterparty] > 0) activeRooms[r.counterparty]--;
        }
    }
}
