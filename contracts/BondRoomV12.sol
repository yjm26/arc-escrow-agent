// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/// @title BondRoomV12 — Trustless Escrow with Collateral
/// @notice Collateral locked at creation, cancel = collateral back, arbiter for complex disputes
/// @dev Arc Testnet (USDC native gas token)
/// Fixes from V11:
///   - collateral refund to SELLER (not creator) — fixes creatorIsSeller=false bug
///   - arbiter address separate from treasury
///   - leaveRoom checks fund deadline
///   - autoRelease only callable by buyer/seller
///   - leaveRoom activeRoomCount fix for counterparty
///   - buyerRefund platform fee goes to treasury

contract BondRoomV12 {

    enum State { Created, Joined, Funded, Delivered, Released, Disputed, Refunded, Expired, Cancelled }

    address public immutable treasury;
    address public immutable arbiter;
    string public arbiterName;
    uint256 public constant FUND_TAX_BPS = 100;
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
        uint256 priceUSD;
        uint256 collateralAmount;
        uint256 collateralInContract;
        uint32  createdAt;
        uint32  joinedAt;
        uint32  deliveredAt;
        uint32  disputedAt;
        State   state;
        uint256 valueInContract;
        uint256 platformFee;
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

    mapping(address => uint256) public pendingWithdrawal;

    event RoomCreated(uint256 indexed roomId, address indexed creator, string item, uint256 price, uint256 collateral, bool creatorIsSeller);
    event RoomJoined(uint256 indexed roomId, address indexed counterparty);
    event RoomFunded(uint256 indexed roomId, uint256 amount, uint256 excessRefunded);
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

    constructor(address _treasury, address _arbiter, string memory _arbiterName) {
        require(_treasury != address(0), "Treasury is zero address");
        require(_arbiter != address(0), "Arbiter is zero address");
        treasury = _treasury;
        arbiter = _arbiter;
        arbiterName = _arbiterName;
    }

    // ════════════════════════════════════════════════════════
    //  CORE — Room Lifecycle
    // ════════════════════════════════════════════════════════

    function createRoom(
        string calldata _item,
        uint256 _price,
        uint256 _collateral,
        bytes32 _joinCodeHash,
        bool _creatorIsSeller
    ) external payable nonReentrant returns (uint256) {
        require(_price > 0, "Price must be > 0");
        require(bytes(_item).length > 0, "Item empty");
        require(bytes(_item).length <= 500, "Item too long");
        require(_joinCodeHash != bytes32(0), "Join code hash required");
        require(activeRoomCount[msg.sender] < MAX_ACTIVE_ROOMS, "Max 3 active rooms");
        require(msg.value == _collateral, "Must send exact collateral");

        uint256 id = roomCount++;
        rooms[id] = BondRoom({
            creator: msg.sender,
            counterparty: address(0),
            creatorIsSeller: _creatorIsSeller,
            itemDescription: _item,
            priceUSD: _price,
            collateralAmount: _collateral,
            collateralInContract: _collateral,
            createdAt: uint32(block.timestamp),
            joinedAt: 0,
            deliveredAt: 0,
            disputedAt: 0,
            state: State.Created,
            valueInContract: 0,
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

    function fundRoom(uint256 _roomId) external payable nonReentrant
        onlyBuyer(_roomId)
        inState(_roomId, State.Joined)
    {
        BondRoom storage room = rooms[_roomId];
        require(block.timestamp < room.joinedAt + FUND_DEADLINE, "Fund deadline passed");

        uint256 tax = (msg.value * FUND_TAX_BPS) / BPS_DENOMINATOR;
        uint256 net = msg.value - tax;
        require(net >= room.priceUSD, "Insufficient funds");

        uint256 exactNeeded = (room.priceUSD * BPS_DENOMINATOR) / (BPS_DENOMINATOR - FUND_TAX_BPS);
        uint256 taxAmount = (exactNeeded * FUND_TAX_BPS) / BPS_DENOMINATOR;
        uint256 excess = msg.value - exactNeeded;

        room.valueInContract = room.priceUSD;
        room.platformFee = taxAmount;
        room.state = State.Funded;

        (bool ok1, ) = treasury.call{value: taxAmount}("");
        require(ok1, "Tax transfer failed");

        if (excess > 0) {
            (bool ok2, ) = payable(msg.sender).call{value: excess}("");
            require(ok2, "Excess refund failed");
        }

        emit RoomFunded(_roomId, room.priceUSD, excess);
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

    /// @notice Buyer confirms — seller gets price + collateral back
    function releaseFunds(uint256 _roomId) external nonReentrant
        onlyBuyer(_roomId)
        inState(_roomId, State.Delivered)
    {
        BondRoom storage room = rooms[_roomId];
        address seller = room.creatorIsSeller ? room.creator : room.counterparty;
        uint256 price = room.priceUSD;
        uint256 collat = room.collateralInContract;
        room.valueInContract = 0;
        room.collateralInContract = 0;
        room.state = State.Released;
        _deactivate(room);

        pendingWithdrawal[seller] += price + collat;
        emit RoomReleased(_roomId, price, collat);
    }

    /// @notice Buyer disputes — open Discord ticket, fund freeze
    function dispute(uint256 _roomId) external nonReentrant
        onlyBuyer(_roomId)
        inState(_roomId, State.Delivered)
    {
        rooms[_roomId].state = State.Disputed;
        rooms[_roomId].disputedAt = uint32(block.timestamp);
        emit RoomDisputed(_roomId);
        // Fund freeze. Open Discord ticket for arbiter.
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
        uint256 price = room.priceUSD;
        uint256 collat = room.collateralInContract;
        uint256 fee = room.platformFee;
        room.valueInContract = 0;
        room.collateralInContract = 0;
        room.platformFee = 0;
        room.state = State.Refunded;
        _deactivate(room);

        // Buyer gets price + collateral (seller penalty)
        pendingWithdrawal[buyer] += price + collat;
        // Platform fee stays in contract (buyer's cost of failed deal)
        emit RoomRefunded(_roomId, price, collat);
    }

    // ════════════════════════════════════════════════════════
    //  AUTO-RELEASE (only buyer or seller can call)
    // ════════════════════════════════════════════════════════

    function autoRelease(uint256 _roomId) external nonReentrant
        inState(_roomId, State.Delivered)
    {
        BondRoom storage room = rooms[_roomId];
        address seller = room.creatorIsSeller ? room.creator : room.counterparty;
        address buyer = room.creatorIsSeller ? room.counterparty : room.creator;
        require(
            msg.sender == seller || msg.sender == buyer,
            "Only buyer or seller"
        );
        require(
            block.timestamp >= room.deliveredAt + AUTO_RELEASE_TIME,
            "Too early - countdown not over"
        );

        uint256 price = room.priceUSD;
        uint256 collat = room.collateralInContract;
        room.valueInContract = 0;
        room.collateralInContract = 0;
        room.state = State.Released;
        _deactivate(room);

        pendingWithdrawal[seller] += price + collat;
        emit RoomReleased(_roomId, price, collat);
    }

    // ════════════════════════════════════════════════════════
    //  ARBITER (after Discord ticket investigation)
    // ════════════════════════════════════════════════════════

    function arbiterResolve(uint256 _roomId, address _winner) external nonReentrant
        onlyArbiter
        inState(_roomId, State.Disputed)
    {
        BondRoom storage room = rooms[_roomId];
        address seller = room.creatorIsSeller ? room.creator : room.counterparty;
        address buyer = room.creatorIsSeller ? room.counterparty : room.creator;
        require(_winner == seller || _winner == buyer, "Winner must be seller or buyer");

        uint256 price = room.priceUSD;
        uint256 collat = room.collateralInContract;
        room.valueInContract = 0;
        room.collateralInContract = 0;
        room.state = _winner == seller ? State.Released : State.Refunded;
        _deactivate(room);

        if (_winner == seller) {
            pendingWithdrawal[seller] += price + collat;
        } else {
            pendingWithdrawal[buyer] += price + collat;
        }

        emit DisputeResolved(_roomId, _winner, price + collat);
    }

    function arbiterSplit(uint256 _roomId) external nonReentrant
        onlyArbiter
        inState(_roomId, State.Disputed)
    {
        BondRoom storage room = rooms[_roomId];
        address seller = room.creatorIsSeller ? room.creator : room.counterparty;
        address buyer = room.creatorIsSeller ? room.counterparty : room.creator;
        uint256 price = room.priceUSD;
        uint256 collat = room.collateralInContract;
        uint256 total = price + collat;

        room.valueInContract = 0;
        room.collateralInContract = 0;
        room.state = State.Refunded;
        _deactivate(room);

        uint256 half = total / 2;
        pendingWithdrawal[seller] += half;
        pendingWithdrawal[buyer] += total - half;

        emit DisputeResolved(_roomId, address(0), total);
    }

    // ════════════════════════════════════════════════════════
    //  WITHDRAW (pull pattern)
    // ════════════════════════════════════════════════════════

    function withdraw() external nonReentrant {
        uint256 amount = pendingWithdrawal[msg.sender];
        require(amount > 0, "Nothing to withdraw");
        pendingWithdrawal[msg.sender] = 0;

        (bool ok, ) = payable(msg.sender).call{value: amount}("");
        require(ok, "Withdraw failed");

        emit Withdrawn(msg.sender, amount);
    }

    // ════════════════════════════════════════════════════════
    //  CANCEL & EXPIRE — collateral back to seller
    // ════════════════════════════════════════════════════════

    function cancelRoom(uint256 _roomId) external nonReentrant
        inState(_roomId, State.Created)
    {
        require(msg.sender == rooms[_roomId].creator, "Not creator");
        BondRoom storage room = rooms[_roomId];
        room.state = State.Cancelled;
        activeRoomCount[msg.sender]--;
        _refundCollateralToSender(room);
        emit RoomCancelled(_roomId, msg.sender);
    }

    function leaveRoom(uint256 _roomId) external nonReentrant {
        BondRoom storage room = rooms[_roomId];
        require(room.state == State.Joined, "Not in Joined state");
        require(
            msg.sender == room.creator || msg.sender == room.counterparty,
            "Not a participant"
        );
        require(block.timestamp < room.joinedAt + FUND_DEADLINE, "Cannot leave after fund deadline");

        room.state = State.Cancelled;
        activeRoomCount[room.creator]--;
        if (room.counterparty != address(0)) {
            activeRoomCount[room.counterparty]--;
        }
        _refundCollateralToSender(room);
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
        _refundCollateralToSender(room);
        emit RoomExpired(_roomId);
    }

    /// @notice Refund collateral to the SELLER (who actually sent it)
    function _refundCollateralToSender(BondRoom storage room) internal {
        if (room.collateralInContract > 0) {
            uint256 collat = room.collateralInContract;
            room.collateralInContract = 0;
            // Seller is whoever sent collateral (opposite of buyer)
            // If creatorIsSeller → creator sent collateral → refund to creator
            // If !creatorIsSeller → counterparty sent collateral → refund to counterparty
            address seller = room.creatorIsSeller ? room.creator : room.counterparty;
            // Fallback: if counterparty is not set yet, creator must be the one
            if (seller == address(0)) {
                seller = room.creator;
            }
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
        uint256 collateralInContract,
        uint32 createdAt,
        uint32 joinedAt,
        uint32 deliveredAt,
        uint32 disputedAt,
        uint8 state,
        uint256 valueInContract,
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
            room.collateralInContract,
            room.createdAt,
            room.joinedAt,
            room.deliveredAt,
            room.disputedAt,
            uint8(room.state),
            room.valueInContract,
            room.platformFee,
            room.deliveryProofHash
        );
    }

    function verifyJoinCode(uint256 _roomId, bytes calldata _joinCode) external view returns (bool) {
        return keccak256(_joinCode) == rooms[_roomId].joinCodeHash;
    }

    receive() external payable { revert("Use fundRoom or createRoom"); }
}
