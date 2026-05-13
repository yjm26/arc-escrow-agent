// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/// @title BondRoomV8 — Trustless Escrow + Collateral for OTC Deals
/// @notice Free create/join, 1% tax on fund, collateral system, arbiter dispute
/// @dev Arc Testnet (USDC native gas token)
contract BondRoomV8 {

    // ════════════════════════════════════════════════════════
    //  STATE
    // ════════════════════════════════════════════════════════

    enum State { Created, Joined, Funded, Delivered, Released, Disputed, Refunded, Expired, Cancelled }

    address public immutable treasury;
    string public arbiterName;
    uint256 public constant FUND_TAX_BPS = 100; // 1%
    uint256 public constant BPS_DENOMINATOR = 10000;
    uint256 public constant MAX_ACTIVE_ROOMS = 3;

    // Timers
    uint256 public constant JOIN_DEADLINE = 4 hours;
    uint256 public constant FUND_DEADLINE = 2 hours;
    uint256 public constant AUTO_RELEASE_TIME = 24 hours;

    struct BondRoom {
        address creator;
        address counterparty;
        string  itemDescription;
        uint256 priceUSD;
        uint256 collateralAmount;    // seller locks this at creation
        uint32  createdAt;
        uint32  joinedAt;
        uint32  deliveredAt;
        State   state;
        uint256 valueInContract;     // buyer's funds (price)
        uint256 collateralInContract; // seller's locked collateral
        uint256 platformFee;
        bytes32 joinCodeHash;
        bytes32 deliveryProofHash;
    }

    mapping(uint256 => BondRoom) public rooms;
    uint256 public roomCount;

    // ════════════════════════════════════════════════════════
    //  ACTIVE ROOM TRACKING
    // ════════════════════════════════════════════════════════

    mapping(address => uint256) public activeRoomCount;

    function _isActive(State s) private pure returns (bool) {
        return s == State.Created || s == State.Joined || s == State.Funded
            || s == State.Delivered || s == State.Disputed;
    }

    function _deactivate(BondRoom storage room) internal {
        activeRoomCount[room.creator]--;
        if (room.counterparty != address(0)) {
            activeRoomCount[room.counterparty]--;
        }
    }

    // ════════════════════════════════════════════════════════
    //  REENTRANCY GUARD
    // ════════════════════════════════════════════════════════

    uint256 private _locked = 1;

    modifier nonReentrant() {
        require(_locked == 1, "ReentrancyGuard: reentrant call");
        _locked = 2;
        _;
        _locked = 1;
    }

    // ════════════════════════════════════════════════════════
    //  EVENTS
    // ════════════════════════════════════════════════════════

    event RoomCreated(uint256 indexed roomId, address indexed creator, string item, uint256 price, uint256 collateral);
    event RoomJoined(uint256 indexed roomId, address indexed counterparty);
    event RoomFunded(uint256 indexed roomId, uint256 amount, uint256 excessRefunded);
    event RoomDelivered(uint256 indexed roomId, bytes32 proofHash);
    event RoomReleased(uint256 indexed roomId, uint256 amount);
    event RoomDisputed(uint256 indexed roomId);
    event RoomRefunded(uint256 indexed roomId, uint256 amount);
    event RoomExpired(uint256 indexed roomId);
    event RoomCancelled(uint256 indexed roomId, address indexed by);
    event DisputeResolved(uint256 indexed roomId, address indexed winner, uint256 amount);

    // ════════════════════════════════════════════════════════
    //  MODIFIERS
    // ════════════════════════════════════════════════════════

    modifier onlyCreator(uint256 _roomId) {
        require(msg.sender == rooms[_roomId].creator, "Not creator");
        _;
    }

    modifier onlyCounterparty(uint256 _roomId) {
        require(msg.sender == rooms[_roomId].counterparty, "Not counterparty");
        _;
    }

    modifier onlyArbiter() {
        require(msg.sender == treasury, "Not arbiter");
        _;
    }

    modifier inState(uint256 _roomId, State _s) {
        require(rooms[_roomId].state == _s, "Wrong state");
        _;
    }

    constructor(address _treasury, string memory _arbiterName) {
        require(_treasury != address(0), "Treasury is zero address");
        treasury = _treasury;
        arbiterName = _arbiterName;
    }

    // ════════════════════════════════════════════════════════
    //  HELPER — collateral refund to seller
    // ════════════════════════════════════════════════════════

    function _refundCollateralToSeller(BondRoom storage room) internal {
        if (room.collateralInContract > 0) {
            uint256 collat = room.collateralInContract;
            room.collateralInContract = 0;
            (bool ok, ) = room.creator.call{value: collat}("");
            require(ok, "Collateral refund failed");
        }
    }

    // ════════════════════════════════════════════════════════
    //  CORE — Room Lifecycle
    // ════════════════════════════════════════════════════════

    function createRoom(
        string calldata _item,
        uint256 _price,
        uint256 _collateral,
        bytes32 _joinCodeHash
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
            itemDescription: _item,
            priceUSD: _price,
            collateralAmount: _collateral,
            createdAt: uint32(block.timestamp),
            joinedAt: 0,
            deliveredAt: 0,
            state: State.Created,
            valueInContract: 0,
            collateralInContract: _collateral,
            platformFee: 0,
            joinCodeHash: _joinCodeHash,
            deliveryProofHash: bytes32(0)
        });

        activeRoomCount[msg.sender]++;
        emit RoomCreated(id, msg.sender, _item, _price, _collateral);
        return id;
    }

    function joinRoom(uint256 _roomId, bytes calldata _joinCode) external nonReentrant
        inState(_roomId, State.Created)
    {
        BondRoom storage room = rooms[_roomId];
        require(msg.sender != room.creator, "Creator cannot join");
        require(keccak256(_joinCode) == room.joinCodeHash, "Invalid join code");
        require(activeRoomCount[msg.sender] < MAX_ACTIVE_ROOMS, "Max 3 active rooms");

        room.counterparty = msg.sender;
        room.joinedAt = uint32(block.timestamp);
        room.state = State.Joined;
        activeRoomCount[msg.sender]++;

        emit RoomJoined(_roomId, msg.sender);
    }

    function fundRoom(uint256 _roomId) external payable nonReentrant
        onlyCounterparty(_roomId)
        inState(_roomId, State.Joined)
    {
        BondRoom storage room = rooms[_roomId];
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
            (bool ok2, ) = msg.sender.call{value: excess}("");
            require(ok2, "Excess refund failed");
        }

        emit RoomFunded(_roomId, room.priceUSD, excess);
    }

    function markDelivered(uint256 _roomId, bytes32 _proofHash) external nonReentrant
        onlyCreator(_roomId)
        inState(_roomId, State.Funded)
    {
        rooms[_roomId].state = State.Delivered;
        rooms[_roomId].deliveredAt = uint32(block.timestamp);
        rooms[_roomId].deliveryProofHash = _proofHash;
        emit RoomDelivered(_roomId, _proofHash);
    }

    // ════════════════════════════════════════════════════════
    //  BUYER ACTIONS (after delivered)
    // ════════════════════════════════════════════════════════

    /// @notice Buyer confirms delivery — seller gets price + collateral back
    function releaseFunds(uint256 _roomId) external nonReentrant
        onlyCounterparty(_roomId)
        inState(_roomId, State.Delivered)
    {
        BondRoom storage room = rooms[_roomId];

        uint256 price = room.valueInContract;
        uint256 collat = room.collateralInContract;
        room.valueInContract = 0;
        room.collateralInContract = 0;
        room.state = State.Released;
        _deactivate(room);

        // Seller gets price + collateral back
        (bool ok, ) = room.creator.call{value: price + collat}("");
        require(ok, "Release failed");

        emit RoomReleased(_roomId, price + collat);
    }

    /// @notice Buyer disputes — open Discord ticket for arbiter
    function dispute(uint256 _roomId) external nonReentrant
        onlyCounterparty(_roomId)
        inState(_roomId, State.Delivered)
    {
        rooms[_roomId].state = State.Disputed;
        emit RoomDisputed(_roomId);
        // Fund freeze. Open Discord ticket.
        // Arbiter investigates, then calls arbiterResolve or arbiterSplit.
    }

    // ════════════════════════════════════════════════════════
    //  AUTO-RELEASE
    // ════════════════════════════════════════════════════════

    function autoRelease(uint256 _roomId) external nonReentrant
        inState(_roomId, State.Delivered)
    {
        BondRoom storage room = rooms[_roomId];
        require(
            block.timestamp >= room.deliveredAt + AUTO_RELEASE_TIME,
            "Too early - 24h countdown not over"
        );

        uint256 price = room.valueInContract;
        uint256 collat = room.collateralInContract;
        room.valueInContract = 0;
        room.collateralInContract = 0;
        room.state = State.Released;
        _deactivate(room);

        // Seller gets price + collateral back (buyer didn't dispute in time)
        (bool ok, ) = room.creator.call{value: price + collat}("");
        require(ok, "Auto-release failed");

        emit RoomReleased(_roomId, price + collat);
    }

    // ════════════════════════════════════════════════════════
    //  ARBITER (after Discord ticket investigation)
    // ════════════════════════════════════════════════════════

    /// @notice Arbiter picks winner after investigating on Discord
    function arbiterResolve(uint256 _roomId, address _winner) external nonReentrant
        onlyArbiter
        inState(_roomId, State.Disputed)
    {
        BondRoom storage room = rooms[_roomId];
        require(
            _winner == room.creator || _winner == room.counterparty,
            "Winner must be creator or counterparty"
        );

        uint256 price = room.valueInContract;
        uint256 collat = room.collateralInContract;
        room.valueInContract = 0;
        room.collateralInContract = 0;
        room.state = _winner == room.creator ? State.Released : State.Refunded;
        _deactivate(room);

        if (_winner == room.creator) {
            // Seller wins: gets price + collateral back (delivered properly)
            (bool ok, ) = room.creator.call{value: price + collat}("");
            require(ok, "Arbiter payout failed");
        } else {
            // Buyer wins: gets price + collateral (seller scammed)
            (bool ok, ) = room.counterparty.call{value: price + collat}("");
            require(ok, "Arbiter payout failed");
        }

        emit DisputeResolved(_roomId, _winner, price + collat);
    }

    /// @notice Arbiter splits 50/50 — unclear fault, both lose something
    function arbiterSplit(uint256 _roomId) external nonReentrant
        onlyArbiter
        inState(_roomId, State.Disputed)
    {
        BondRoom storage room = rooms[_roomId];
        uint256 price = room.valueInContract;
        uint256 collat = room.collateralInContract;
        uint256 total = price + collat;
        uint256 half = total / 2;
        uint256 remainder = total - half;

        room.valueInContract = 0;
        room.collateralInContract = 0;
        room.state = State.Refunded;
        _deactivate(room);

        // Seller gets remainder, buyer gets half
        (bool ok1, ) = room.creator.call{value: remainder}("");
        require(ok1, "Split to seller failed");

        (bool ok2, ) = room.counterparty.call{value: half}("");
        require(ok2, "Split to buyer failed");

        emit DisputeResolved(_roomId, address(0), total);
    }

    // ════════════════════════════════════════════════════════
    //  CANCEL & EXPIRE
    // ════════════════════════════════════════════════════════

    /// @notice Cancel before anyone joins — collateral back to seller
    function cancelRoom(uint256 _roomId) external nonReentrant
        onlyCreator(_roomId)
        inState(_roomId, State.Created)
    {
        BondRoom storage room = rooms[_roomId];
        room.state = State.Cancelled;
        activeRoomCount[msg.sender]--;
        _refundCollateralToSeller(room);
        emit RoomCancelled(_roomId, msg.sender);
    }

    /// @notice Either party cancels after join but before funded — collateral back
    function leaveRoom(uint256 _roomId) external nonReentrant {
        BondRoom storage room = rooms[_roomId];
        require(room.state == State.Joined, "Not in Joined state");
        require(
            msg.sender == room.creator || msg.sender == room.counterparty,
            "Not a participant"
        );
        room.state = State.Cancelled;
        activeRoomCount[room.creator]--;
        activeRoomCount[room.counterparty]--;
        _refundCollateralToSeller(room);
        emit RoomCancelled(_roomId, msg.sender);
    }

    /// @notice Expire after deadline — collateral back to seller
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

    // ════════════════════════════════════════════════════════
    //  VIEW
    // ════════════════════════════════════════════════════════

    function getRoom(uint256 _roomId) external view returns (
        address creator,
        address counterparty,
        string memory itemDescription,
        uint256 priceUSD,
        uint256 collateralAmount,
        uint32 createdAt,
        uint32 joinedAt,
        uint32 deliveredAt,
        State state,
        uint256 valueInContract,
        uint256 collateralInContract,
        uint256 platformFee,
        bytes32 deliveryProofHash
    ) {
        BondRoom storage room = rooms[_roomId];
        return (
            room.creator,
            room.counterparty,
            room.itemDescription,
            room.priceUSD,
            room.collateralAmount,
            room.createdAt,
            room.joinedAt,
            room.deliveredAt,
            room.state,
            room.valueInContract,
            room.collateralInContract,
            room.platformFee,
            room.deliveryProofHash
        );
    }

    function verifyJoinCode(uint256 _roomId, bytes calldata _joinCode) external view returns (bool) {
        return keccak256(_joinCode) == rooms[_roomId].joinCodeHash;
    }

    receive() external payable { revert("Use fundRoom or createRoom"); }
}
