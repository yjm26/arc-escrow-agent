// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IERC20 {
    function transfer(address to, uint256 amount) external returns (bool);
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
}

contract BondRoomV16 {
    // ─── State ───
    address public owner;
    IERC20 public usdc;
    address public treasury;
    address public arbiter;
    string public arbiterName;

    uint256 public roomCount;
    mapping(uint256 => Room) public rooms;
    mapping(address => uint256) public activeRooms;

    // ─── Constants ───
    uint256 public constant FUND_TAX_BPS = 100;        // 1%
    uint256 public constant BPS_DENOM = 10000;
    uint256 public constant MAX_ACTIVE = 3;
    uint256 public constant JOIN_DL = 1 days;
    uint256 public constant FUND_DL = 1 days;
    uint256 public constant AUTO_RELEASE = 3 days;
    uint256 public constant MIN_DELIVERY_DAYS = 1;
    uint256 public constant MAX_DELIVERY_DAYS = 90;

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
        State state;
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
        uint32 deliveryDeadline
    );
    event RoomJoined(uint256 indexed id, address indexed who);
    event RoomFunded(uint256 indexed id, uint256 amount, uint256 fee);
    event RoomDelivered(uint256 indexed id, bytes32 proof);
    event RoomReleased(uint256 indexed id, uint256 amount, uint256 collateral);
    event RoomDisputed(uint256 indexed id);
    event RoomRefunded(uint256 indexed id, uint256 amount, uint256 collateral);
    event RoomExpired(uint256 indexed id);
    event RoomCancelled(uint256 indexed id, address indexed by);
    event DisputeResolved(uint256 indexed id, address indexed winner, uint256 amount);

    // ─── Modifiers ───
    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner");
        _;
    }

    modifier onlyArbiter() {
        require(msg.sender == arbiter, "Only arbiter");
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

    // ─── Create Room ───
    function createRoom(
        string calldata _item,
        uint256 _price,
        uint256 _collateral,
        bytes32 _joinCodeHash,
        bool _creatorIsSeller,
        uint32 _deliveryDays
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
            state: State.Created,
            fundedAmount: 0,
            platformFee: 0,
            deliveryProofHash: bytes32(0),
            joinCodeHash: _joinCodeHash
        });

        activeRooms[msg.sender]++;

        // If creator is seller, they must lock collateral now
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
            rooms[id].deliveryDeadline
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

        // If creator is buyer, counterparty (seller) must lock collateral now
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
        r.state = State.Delivered;

        emit RoomDelivered(_roomId, _proofHash);
    }

    // ─── Release Funds ───
    function releaseFunds(uint256 _roomId) external {
        Room storage r = rooms[_roomId];
        require(r.state == State.Delivered, "Not delivered");
        require(msg.sender == _buyer(r), "Only buyer can release");

        _release(_roomId, r);
    }

    function _release(uint256 _roomId, Room storage r) internal {
        address seller = _seller(r);

        uint256 payout = r.fundedAmount + r.collateralAmount;

        // Send platform fee to treasury (if any)
        if (r.platformFee > 0) {
            usdc.transfer(treasury, r.platformFee);
        }

        // Send payout to seller
        if (payout > 0) {
            usdc.transfer(seller, payout);
        }

        _closeRoom(_roomId, r);
        r.state = State.Released;

        emit RoomReleased(_roomId, r.fundedAmount, r.collateralAmount);
    }

    // ─── Auto Release ───
    function autoRelease(uint256 _roomId) external {
        Room storage r = rooms[_roomId];
        require(r.state == State.Delivered, "Not delivered");
        require(block.timestamp > r.deliveredAt + AUTO_RELEASE, "Auto-release not yet");

        _release(_roomId, r);
    }

    // ─── Dispute ───
    function dispute(uint256 _roomId) external {
        Room storage r = rooms[_roomId];
        require(r.state == State.Delivered, "Not delivered");
        require(msg.sender == _buyer(r), "Only buyer can dispute");

        r.state = State.Disputed;
        r.disputedAt = uint32(block.timestamp);

        emit RoomDisputed(_roomId);
    }

    // ─── Buyer Refund (seller failed to deliver) ───
    function buyerRefund(uint256 _roomId) external {
        Room storage r = rooms[_roomId];
        require(r.state == State.Funded, "Not funded");
        require(block.timestamp > r.deliveryDeadline, "Deadline not passed");
        require(msg.sender == _buyer(r), "Only buyer");

        address buyer = _buyer(r);
        uint256 totalRefund = r.fundedAmount + r.collateralAmount;

        // Platform fee goes to treasury even on refund (as penalty)
        if (r.platformFee > 0) {
            usdc.transfer(treasury, r.platformFee);
        }

        if (totalRefund > 0) {
            usdc.transfer(buyer, totalRefund);
        }

        _closeRoom(_roomId, r);
        r.state = State.Refunded;

        emit RoomRefunded(_roomId, r.fundedAmount, r.collateralAmount);
    }

    // ─── Arbiter Resolve ───
    function arbiterResolve(uint256 _roomId, address _winner) external onlyArbiter {
        Room storage r = rooms[_roomId];
        require(r.state == State.Disputed, "Not disputed");
        require(_winner == _buyer(r) || _winner == _seller(r), "Invalid winner");

        uint256 total = r.fundedAmount + r.collateralAmount;

        if (_winner == _seller(r)) {
            // Seller wins: gets fundedAmount + collateral, fee to treasury
            if (r.platformFee > 0) usdc.transfer(treasury, r.platformFee);
            if (total > 0) usdc.transfer(_winner, total);
        } else {
            // Buyer wins: gets fundedAmount + collateral, fee to treasury
            if (r.platformFee > 0) usdc.transfer(treasury, r.platformFee);
            if (total > 0) usdc.transfer(_winner, total);
        }

        _closeRoom(_roomId, r);
        r.state = State.Released; // or keep Disputed? V15 used Released

        emit DisputeResolved(_roomId, _winner, total);
    }

    // ─── Arbiter Split ───
    function arbiterSplit(uint256 _roomId) external onlyArbiter {
        Room storage r = rooms[_roomId];
        require(r.state == State.Disputed, "Not disputed");

        uint256 total = r.fundedAmount + r.collateralAmount;
        uint256 half = total / 2;

        if (r.platformFee > 0) usdc.transfer(treasury, r.platformFee);

        if (half > 0) {
            usdc.transfer(_buyer(r), half);
            usdc.transfer(_seller(r), total - half); // handle odd
        }

        _closeRoom(_roomId, r);
        r.state = State.Released;

        emit DisputeResolved(_roomId, address(0), total);
    }

    // ─── Cancel Room (creator, before join) ───
    function cancelRoom(uint256 _roomId) external {
        Room storage r = rooms[_roomId];
        require(r.creator == msg.sender, "Only creator");
        require(r.state == State.Created, "Not cancellable");

        // If creator locked collateral (creatorIsSeller), refund it
        if (r.creatorIsSeller && r.collateralAmount > 0) {
            usdc.transfer(r.creator, r.collateralAmount);
        }

        _closeRoom(_roomId, r);
        r.state = State.Cancelled;

        emit RoomCancelled(_roomId, msg.sender);
    }

    // ─── Leave Room (counterparty, before fund) ───
    function leaveRoom(uint256 _roomId) external {
        Room storage r = rooms[_roomId];
        require(r.counterparty == msg.sender, "Only counterparty");
        require(r.state == State.Joined, "Not joined");

        // If counterparty locked collateral (!creatorIsSeller), refund it
        if (!r.creatorIsSeller && r.collateralAmount > 0) {
            usdc.transfer(r.counterparty, r.collateralAmount);
        }

        activeRooms[msg.sender]--;
        r.counterparty = address(0);
        r.joinedAt = 0;
        r.state = State.Created;

        // Note: activeRooms for creator stays, room stays open
    }

    // ─── Expire Room ───
    function expireRoom(uint256 _roomId) external {
        Room storage r = rooms[_roomId];
        require(r.state == State.Created || r.state == State.Joined, "Not expirable");

        if (r.state == State.Created) {
            require(block.timestamp > r.createdAt + JOIN_DL, "Not expired");
            // Refund creator collateral if locked
            if (r.creatorIsSeller && r.collateralAmount > 0) {
                usdc.transfer(r.creator, r.collateralAmount);
            }
        } else {
            // Joined state
            require(block.timestamp > r.joinedAt + FUND_DL, "Not expired");
            // Refund counterparty collateral if locked
            if (!r.creatorIsSeller && r.collateralAmount > 0) {
                usdc.transfer(r.counterparty, r.collateralAmount);
            }
            activeRooms[r.counterparty]--;
        }

        _closeRoom(_roomId, r);
        r.state = State.Expired;

        emit RoomExpired(_roomId);
    }

    // ─── Internal Close ───
    function _closeRoom(uint256 _roomId, Room storage r) internal {
        activeRooms[r.creator]--;
        if (r.counterparty != address(0)) {
            activeRooms[r.counterparty]--;
        }
        // Optional: delete room data to save gas / prevent re-entry
        // delete rooms[_roomId];
    }

    // ─── Views ───
    function getRoom(uint256 _roomId) external view returns (
        address creator,
        address counterparty,
        bool creatorIsSeller,
        string memory itemDescription,
        uint256 priceUSD,
        uint256 collateralAmount,
        uint32 createdAt,
        uint32 joinedAt,
        uint32 deliveredAt,
        uint32 disputedAt,
        uint32 deliveryDeadline,
        uint8 state,
        uint256 fundedAmount,
        uint256 platformFee,
        bytes32 deliveryProofHash
    ) {
        Room storage r = rooms[_roomId];
        return (
            r.creator,
            r.counterparty,
            r.creatorIsSeller,
            r.itemDescription,
            r.priceUSD,
            r.collateralAmount,
            r.createdAt,
            r.joinedAt,
            r.deliveredAt,
            r.disputedAt,
            r.deliveryDeadline,
            uint8(r.state),
            r.fundedAmount,
            r.platformFee,
            r.deliveryProofHash
        );
    }

    function getRoomFull(uint256 _roomId) external view returns (Room memory) {
        return rooms[_roomId];
    }

    function verifyJoinCode(uint256 _roomId, bytes calldata _joinCode) public view returns (bool) {
        Room storage r = rooms[_roomId];
        if (r.creator == address(0)) return false;
        return keccak256(abi.encodePacked(_joinCode)) == r.joinCodeHash;
    }

    function contractBalance() external view returns (uint256) {
        return usdc.balanceOf(address(this));
    }
}
