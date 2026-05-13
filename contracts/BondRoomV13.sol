// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

interface IERC20 {
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    function transfer(address to, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
    function approve(address spender, uint256 amount) external returns (bool);
}

/// @title BondRoomV13 — Trustless Escrow, all amounts in USDC
/// @notice Collateral + escrow + fee = all USDC. No ETH involved.
contract BondRoomV13 {

    enum State { Created, Joined, Funded, Delivered, Released, Disputed, Refunded, Expired, Cancelled }

    IERC20 public immutable usdc;
    address public immutable treasury;
    address public immutable arbiter;
    string public arbiterName;
    uint256 public constant FUND_TAX_BPS = 100;   // 1%
    uint256 public constant BPS_DENOMINATOR = 10000;
    uint256 public constant MAX_ACTIVE_ROOMS = 3;

    uint256 public constant JOIN_DEADLINE    = 1 hours;
    uint256 public constant FUND_DEADLINE    = 30 minutes;
    uint256 public constant DELIVER_DEADLINE = 4 hours;
    uint256 public constant AUTO_RELEASE_TIME = 2 hours;

    struct BondRoom {
        address creator;
        address counterparty;
        bool    creatorIsSeller;
        string  itemDescription;
        uint256 priceUSD;           // price in USDC (6 decimals)
        uint256 collateralAmount;   // collateral in USDC
        uint32  createdAt;
        uint32  joinedAt;
        uint32  deliveredAt;
        uint32  disputedAt;
        State   state;
        uint256 fundedAmount;       // USDC held in escrow (price only)
        uint256 platformFee;        // USDC fee taken at fund time
        bytes32 joinCodeHash;
        bytes32 deliveryProofHash;
    }

    mapping(uint256 => BondRoom) public rooms;
    uint256 public roomCount;
    mapping(address => uint256) public activeRoomCount;

    function _isActive(State s) private pure returns (bool) {
        return s == State.Created || s == State.Joined || s == State.Funded
            || s == State.Delivered || s == State.Disputed;
    }

    function _deactivate(BondRoom storage room) internal {
        activeRoomCount[room.creator]--;
        if (room.counterparty != address(0) && room.counterparty != room.creator) {
            activeRoomCount[room.counterparty]--;
        }
    }

    uint256 private _locked = 1;
    modifier nonReentrant() {
        require(_locked == 1, "ReentrancyGuard: reentrant call");
        _locked = 2;
        _;
        _locked = 1;
    }

    // Pull pattern — claimable USDC balances
    mapping(address => uint256) public pendingWithdrawal;

    event RoomCreated(uint256 indexed roomId, address indexed creator, string item, uint256 price, uint256 collateral, bool creatorIsSeller);
    event RoomJoined(uint256 indexed roomId, address indexed counterparty);
    event RoomFunded(uint256 indexed roomId, uint256 amount, uint256 fee);
    event RoomDelivered(uint256 indexed roomId, bytes32 proofHash);
    event RoomReleased(uint256 indexed roomId, uint256 amount, uint256 collateral);
    event RoomDisputed(uint256 indexed roomId);
    event RoomRefunded(uint256 indexed roomId, uint256 amount, uint256 collateral);
    event RoomExpired(uint256 indexed roomId);
    event RoomCancelled(uint256 indexed roomId, address indexed by);
    event DisputeResolved(uint256 indexed roomId, address indexed winner, uint256 amount);
    event Withdrawn(address indexed to, uint256 amount);

    modifier onlySeller(uint256 _roomId) {
        BondRoom storage room = rooms[_roomId];
        address seller = room.creatorIsSeller ? room.creator : room.counterparty;
        require(msg.sender == seller, "Not seller");
        _;
    }

    modifier onlyBuyer(uint256 _roomId) {
        BondRoom storage room = rooms[_roomId];
        address buyer = room.creatorIsSeller ? room.counterparty : room.creator;
        require(msg.sender == buyer, "Not buyer");
        _;
    }

    modifier onlyArbiter() {
        require(msg.sender == arbiter, "Not arbiter");
        _;
    }

    modifier inState(uint256 _roomId, State _s) {
        require(rooms[_roomId].state == _s, "Wrong state");
        _;
    }

    constructor(address _usdc, address _treasury, address _arbiter, string memory _arbiterName) {
        require(_usdc != address(0), "USDC is zero address");
        require(_treasury != address(0), "Treasury is zero address");
        require(_arbiter != address(0), "Arbiter is zero address");
        usdc = IERC20(_usdc);
        treasury = _treasury;
        arbiter = _arbiter;
        arbiterName = _arbiterName;
    }

    // ════════════════════════════════════════════════════════
    //  CORE — Room Lifecycle
    // ════════════════════════════════════════════════════════

    /// @notice Create room. Seller sends collateral in USDC.
    /// @dev Caller must approve USDC to this contract first.
    function createRoom(
        string calldata _item,
        uint256 _price,
        uint256 _collateral,
        bytes32 _joinCodeHash,
        bool _creatorIsSeller
    ) external nonReentrant returns (uint256) {
        require(_price > 0, "Price must be > 0");
        require(bytes(_item).length > 0, "Item empty");
        require(bytes(_item).length <= 500, "Item too long");
        require(_joinCodeHash != bytes32(0), "Join code hash required");
        require(activeRoomCount[msg.sender] < MAX_ACTIVE_ROOMS, "Max 3 active rooms");

        // Transfer collateral USDC from creator to contract
        if (_collateral > 0) {
            require(usdc.transferFrom(msg.sender, address(this), _collateral), "Collateral transfer failed");
        }

        uint256 id = roomCount++;
        rooms[id] = BondRoom({
            creator: msg.sender,
            counterparty: address(0),
            creatorIsSeller: _creatorIsSeller,
            itemDescription: _item,
            priceUSD: _price,
            collateralAmount: _collateral,
            createdAt: uint32(block.timestamp),
            joinedAt: 0,
            deliveredAt: 0,
            disputedAt: 0,
            state: State.Created,
            fundedAmount: 0,
            platformFee: 0,
            joinCodeHash: _joinCodeHash,
            deliveryProofHash: bytes32(0)
        });

        activeRoomCount[msg.sender]++;
        emit RoomCreated(id, msg.sender, _item, _price, _collateral, _creatorIsSeller);
        return id;
    }

    function joinRoom(uint256 _roomId, bytes calldata _joinCode) external nonReentrant
        inState(_roomId, State.Created)
    {
        BondRoom storage room = rooms[_roomId];
        require(msg.sender != room.creator, "Creator cannot join own room");
        require(keccak256(_joinCode) == room.joinCodeHash, "Invalid join code");
        require(activeRoomCount[msg.sender] < MAX_ACTIVE_ROOMS, "Max 3 active rooms");
        require(block.timestamp < room.createdAt + JOIN_DEADLINE, "Join deadline passed");

        room.counterparty = msg.sender;
        room.joinedAt = uint32(block.timestamp);
        room.state = State.Joined;
        activeRoomCount[msg.sender]++;

        emit RoomJoined(_roomId, msg.sender);
    }

    /// @notice Buyer funds escrow in USDC (price + 1% fee).
    /// @dev Caller must approve USDC to this contract first.
    function fundRoom(uint256 _roomId) external nonReentrant
        onlyBuyer(_roomId)
        inState(_roomId, State.Joined)
    {
        BondRoom storage room = rooms[_roomId];
        require(block.timestamp < room.joinedAt + FUND_DEADLINE, "Fund deadline passed");

        // Exact amount needed: price / (1 - 1%) = price * 10000 / 9900
        uint256 exactNeeded = (room.priceUSD * BPS_DENOMINATOR) / (BPS_DENOMINATOR - FUND_TAX_BPS);
        uint256 taxAmount = (exactNeeded * FUND_TAX_BPS) / BPS_DENOMINATOR;

        // Transfer total USDC from buyer to contract
        require(usdc.transferFrom(msg.sender, address(this), exactNeeded), "Fund transfer failed");

        room.fundedAmount = room.priceUSD;
        room.platformFee = taxAmount;
        room.state = State.Funded;

        // Send fee to treasury immediately
        if (taxAmount > 0) {
            require(usdc.transfer(treasury, taxAmount), "Fee transfer failed");
        }

        emit RoomFunded(_roomId, room.priceUSD, taxAmount);
    }

    function markDelivered(uint256 _roomId, bytes32 _proofHash) external nonReentrant
        onlySeller(_roomId)
        inState(_roomId, State.Funded)
    {
        rooms[_roomId].state = State.Delivered;
        rooms[_roomId].deliveredAt = uint32(block.timestamp);
        rooms[_roomId].deliveryProofHash = _proofHash;
        emit RoomDelivered(_roomId, _proofHash);
    }

    // ════════════════════════════════════════════════════════
    //  BUYER ACTIONS
    // ════════════════════════════════════════════════════════

    /// @notice Buyer confirms — seller gets price + collateral
    function releaseFunds(uint256 _roomId) external nonReentrant
        onlyBuyer(_roomId)
        inState(_roomId, State.Delivered)
    {
        BondRoom storage room = rooms[_roomId];
        address seller = room.creatorIsSeller ? room.creator : room.counterparty;
        uint256 price = room.fundedAmount;
        uint256 collat = room.collateralAmount;
        room.fundedAmount = 0;
        room.collateralAmount = 0;
        room.state = State.Released;
        _deactivate(room);

        pendingWithdrawal[seller] += price + collat;
        emit RoomReleased(_roomId, price, collat);
    }

    /// @notice Buyer disputes — fund freeze
    function dispute(uint256 _roomId) external nonReentrant
        onlyBuyer(_roomId)
        inState(_roomId, State.Delivered)
    {
        rooms[_roomId].state = State.Disputed;
        rooms[_roomId].disputedAt = uint32(block.timestamp);
        emit RoomDisputed(_roomId);
    }

    /// @notice Buyer refunds if seller doesn't deliver in time
    function buyerRefund(uint256 _roomId) external nonReentrant
        onlyBuyer(_roomId)
        inState(_roomId, State.Funded)
    {
        BondRoom storage room = rooms[_roomId];
        require(
            block.timestamp >= room.joinedAt + DELIVER_DEADLINE,
            "Seller still has time to deliver"
        );

        address buyer = room.creatorIsSeller ? room.counterparty : room.creator;
        uint256 price = room.fundedAmount;
        uint256 collat = room.collateralAmount;
        room.fundedAmount = 0;
        room.collateralAmount = 0;
        room.state = State.Refunded;
        _deactivate(room);

        // Buyer gets price + collateral (seller penalty)
        pendingWithdrawal[buyer] += price + collat;
        emit RoomRefunded(_roomId, price, collat);
    }

    // ════════════════════════════════════════════════════════
    //  AUTO-RELEASE
    // ════════════════════════════════════════════════════════

    function autoRelease(uint256 _roomId) external nonReentrant
        inState(_roomId, State.Delivered)
    {
        BondRoom storage room = rooms[_roomId];
        address seller = room.creatorIsSeller ? room.creator : room.counterparty;
        address buyer = room.creatorIsSeller ? room.counterparty : room.creator;
        require(msg.sender == seller || msg.sender == buyer, "Only buyer or seller");
        require(block.timestamp >= room.deliveredAt + AUTO_RELEASE_TIME, "Too early");

        uint256 price = room.fundedAmount;
        uint256 collat = room.collateralAmount;
        room.fundedAmount = 0;
        room.collateralAmount = 0;
        room.state = State.Released;
        _deactivate(room);

        pendingWithdrawal[seller] += price + collat;
        emit RoomReleased(_roomId, price, collat);
    }

    // ════════════════════════════════════════════════════════
    //  ARBITER
    // ════════════════════════════════════════════════════════

    function arbiterResolve(uint256 _roomId, address _winner) external nonReentrant
        onlyArbiter
        inState(_roomId, State.Disputed)
    {
        BondRoom storage room = rooms[_roomId];
        address seller = room.creatorIsSeller ? room.creator : room.counterparty;
        address buyer = room.creatorIsSeller ? room.counterparty : room.creator;
        require(_winner == seller || _winner == buyer, "Winner must be seller or buyer");

        uint256 price = room.fundedAmount;
        uint256 collat = room.collateralAmount;
        room.fundedAmount = 0;
        room.collateralAmount = 0;
        room.state = _winner == seller ? State.Released : State.Refunded;
        _deactivate(room);

        pendingWithdrawal[_winner] += price + collat;
        emit DisputeResolved(_roomId, _winner, price + collat);
    }

    function arbiterSplit(uint256 _roomId) external nonReentrant
        onlyArbiter
        inState(_roomId, State.Disputed)
    {
        BondRoom storage room = rooms[_roomId];
        address seller = room.creatorIsSeller ? room.creator : room.counterparty;
        address buyer = room.creatorIsSeller ? room.counterparty : room.creator;
        uint256 price = room.fundedAmount;
        uint256 collat = room.collateralAmount;
        uint256 total = price + collat;

        room.fundedAmount = 0;
        room.collateralAmount = 0;
        room.state = State.Refunded;
        _deactivate(room);

        uint256 half = total / 2;
        pendingWithdrawal[seller] += half;
        pendingWithdrawal[buyer] += total - half;
        emit DisputeResolved(_roomId, address(0), total);
    }

    // ════════════════════════════════════════════════════════
    //  WITHDRAW (pull pattern — USDC)
    // ════════════════════════════════════════════════════════

    function withdraw() external nonReentrant {
        uint256 amount = pendingWithdrawal[msg.sender];
        require(amount > 0, "Nothing to withdraw");
        pendingWithdrawal[msg.sender] = 0;
        require(usdc.transfer(msg.sender, amount), "Withdraw transfer failed");
        emit Withdrawn(msg.sender, amount);
    }

    // ════════════════════════════════════════════════════════
    //  CANCEL & EXPIRE
    // ════════════════════════════════════════════════════════

    function cancelRoom(uint256 _roomId) external nonReentrant
        inState(_roomId, State.Created)
    {
        require(msg.sender == rooms[_roomId].creator, "Not creator");
        BondRoom storage room = rooms[_roomId];
        room.state = State.Cancelled;
        activeRoomCount[msg.sender]--;
        _refundCollateralToSeller(room);
        emit RoomCancelled(_roomId, msg.sender);
    }

    function leaveRoom(uint256 _roomId) external nonReentrant {
        BondRoom storage room = rooms[_roomId];
        require(room.state == State.Joined, "Not in Joined state");
        require(msg.sender == room.creator || msg.sender == room.counterparty, "Not a participant");
        require(block.timestamp < room.joinedAt + FUND_DEADLINE, "Cannot leave after fund deadline");

        room.state = State.Cancelled;
        activeRoomCount[room.creator]--;
        if (room.counterparty != address(0)) {
            activeRoomCount[room.counterparty]--;
        }
        _refundCollateralToSeller(room);
        emit RoomCancelled(_roomId, msg.sender);
    }

    function expireRoom(uint256 _roomId) external nonReentrant {
        BondRoom storage room = rooms[_roomId];
        if (room.state == State.Created) {
            require(block.timestamp >= room.createdAt + JOIN_DEADLINE, "Too early");
            activeRoomCount[room.creator]--;
        } else if (room.state == State.Joined) {
            require(block.timestamp >= room.joinedAt + FUND_DEADLINE, "Too early");
            activeRoomCount[room.creator]--;
            activeRoomCount[room.counterparty]--;
        } else {
            revert("Cannot expire");
        }
        room.state = State.Expired;
        _refundCollateralToSeller(room);
        emit RoomExpired(_roomId);
    }

    function _refundCollateralToSeller(BondRoom storage room) internal {
        if (room.collateralAmount > 0) {
            uint256 collat = room.collateralAmount;
            room.collateralAmount = 0;
            address seller = room.creatorIsSeller ? room.creator : room.counterparty;
            if (seller == address(0)) seller = room.creator;
            pendingWithdrawal[seller] += collat;
        }
    }

    // ════════════════════════════════════════════════════════
    //  VIEW
    // ════════════════════════════════════════════════════════

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
        uint8 state,
        uint256 fundedAmount,
        uint256 platformFee,
        bytes32 deliveryProofHash
    ) {
        BondRoom storage room = rooms[_roomId];
        return (
            room.creator,
            room.counterparty,
            room.creatorIsSeller,
            room.itemDescription,
            room.priceUSD,
            room.collateralAmount,
            room.createdAt,
            room.joinedAt,
            room.deliveredAt,
            room.disputedAt,
            uint8(room.state),
            room.fundedAmount,
            room.platformFee,
            room.deliveryProofHash
        );
    }

    function verifyJoinCode(uint256 _roomId, bytes calldata _joinCode) external view returns (bool) {
        return keccak256(_joinCode) == rooms[_roomId].joinCodeHash;
    }

    /// @notice Check contract's USDC balance
    function contractBalance() external view returns (uint256) {
        return usdc.balanceOf(address(this));
    }
}
