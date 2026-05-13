// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/// @title BondRoomV9 — Trustless Escrow (role choice)
/// @notice Free create/join, 1% tax on fund, seller/buyer choice, competitive timers
/// @dev Arc Testnet (USDC native gas token)
contract BondRoomV9 {

    enum State { Created, Joined, Funded, Delivered, Released, Disputed, Refunded, Expired, Cancelled }

    address public immutable treasury;
    string public arbiterName;
    uint256 public constant FUND_TAX_BPS = 100;
    uint256 public constant BPS_DENOMINATOR = 10000;
    uint256 public constant MAX_ACTIVE_ROOMS = 3;

    uint256 public constant JOIN_DEADLINE    = 1 hours;
    uint256 public constant FUND_DEADLINE    = 30 minutes;
    uint256 public constant DELIVER_DEADLINE = 4 hours;
    uint256 public constant AUTO_RELEASE_TIME = 2 hours;
    uint256 public constant DISPUTE_TIMEOUT  = 6 hours;

    struct BondRoom {
        address creator;
        address counterparty;
        bool    creatorIsSeller;  // NEW: true=creator sells, false=creator buys
        string  itemDescription;
        uint256 priceUSD;
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

    function _seller(BondRoom storage room) internal view returns (address) {
        return room.creatorIsSeller ? room.creator : room.counterparty;
    }

    function _buyer(BondRoom storage room) internal view returns (address) {
        return room.creatorIsSeller ? room.counterparty : room.creator;
    }

    function _deactivate(BondRoom storage room) internal {
        activeRoomCount[room.creator]--;
        if (room.counterparty != address(0)) {
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

    event RoomCreated(uint256 indexed roomId, address indexed creator, string item, uint256 price, bool creatorIsSeller);
    event RoomJoined(uint256 indexed roomId, address indexed counterparty);
    event RoomFunded(uint256 indexed roomId, uint256 amount, uint256 excessRefunded);
    event RoomDelivered(uint256 indexed roomId, bytes32 proofHash);
    event RoomReleased(uint256 indexed roomId, uint256 amount);
    event RoomDisputed(uint256 indexed roomId);
    event RoomRefunded(uint256 indexed roomId, uint256 amount);
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

    function createRoom(
        string calldata _item,
        uint256 _price,
        bytes32 _joinCodeHash,
        bool _creatorIsSeller
    ) external nonReentrant returns (uint256) {
        require(_price > 0, "Price must be > 0");
        require(bytes(_item).length > 0, "Item empty");
        require(bytes(_item).length <= 500, "Item too long");
        require(_joinCodeHash != bytes32(0), "Join code hash required");
        require(activeRoomCount[msg.sender] < MAX_ACTIVE_ROOMS, "Max 3 active rooms");

        uint256 id = roomCount++;
        rooms[id] = BondRoom({
            creator: msg.sender,
            counterparty: address(0),
            creatorIsSeller: _creatorIsSeller,
            itemDescription: _item,
            priceUSD: _price,
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
        emit RoomCreated(id, msg.sender, _item, _price, _creatorIsSeller);
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

    function releaseFunds(uint256 _roomId) external nonReentrant
        onlyBuyer(_roomId)
        inState(_roomId, State.Delivered)
    {
        BondRoom storage room = rooms[_roomId];
        address seller = room.creatorIsSeller ? room.creator : room.counterparty;
        uint256 amount = room.valueInContract;
        room.valueInContract = 0;
        room.state = State.Released;
        _deactivate(room);

        (bool ok, ) = seller.call{value: amount}("");
        require(ok, "Release failed");

        emit RoomReleased(_roomId, amount);
    }

    function dispute(uint256 _roomId) external nonReentrant
        onlyBuyer(_roomId)
        inState(_roomId, State.Delivered)
    {
        rooms[_roomId].state = State.Disputed;
        rooms[_roomId].disputedAt = uint32(block.timestamp);
        emit RoomDisputed(_roomId);
    }

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
        uint256 amount = room.valueInContract;
        room.valueInContract = 0;
        room.platformFee = 0;
        room.state = State.Refunded;
        _deactivate(room);

        (bool ok, ) = buyer.call{value: amount}("");
        require(ok, "Buyer refund failed");

        emit RoomRefunded(_roomId, amount);
    }

    function autoRelease(uint256 _roomId) external nonReentrant
        inState(_roomId, State.Delivered)
    {
        BondRoom storage room = rooms[_roomId];
        require(
            block.timestamp >= room.deliveredAt + AUTO_RELEASE_TIME,
            "Too early -- countdown not over"
        );

        address seller = room.creatorIsSeller ? room.creator : room.counterparty;
        uint256 amount = room.valueInContract;
        room.valueInContract = 0;
        room.state = State.Released;
        _deactivate(room);

        (bool ok, ) = seller.call{value: amount}("");
        require(ok, "Auto-release failed");

        emit RoomReleased(_roomId, amount);
    }

    function arbiterResolve(uint256 _roomId, address _winner) external nonReentrant
        onlyArbiter
        inState(_roomId, State.Disputed)
    {
        BondRoom storage room = rooms[_roomId];
        address seller = room.creatorIsSeller ? room.creator : room.counterparty;
        address buyer = room.creatorIsSeller ? room.counterparty : room.creator;
        require(_winner == seller || _winner == buyer, "Winner must be seller or buyer");

        uint256 amount = room.valueInContract;
        room.valueInContract = 0;
        room.state = _winner == seller ? State.Released : State.Refunded;
        _deactivate(room);

        (bool ok, ) = _winner.call{value: amount}("");
        require(ok, "Arbiter payout failed");

        emit DisputeResolved(_roomId, _winner, amount);
    }

    function arbiterSplit(uint256 _roomId) external nonReentrant
        onlyArbiter
        inState(_roomId, State.Disputed)
    {
        BondRoom storage room = rooms[_roomId];
        address seller = room.creatorIsSeller ? room.creator : room.counterparty;
        address buyer = room.creatorIsSeller ? room.counterparty : room.creator;
        uint256 total = room.valueInContract;

        room.valueInContract = 0;
        room.state = State.Refunded;
        _deactivate(room);

        pendingWithdrawal[seller] += total - (total / 2);
        pendingWithdrawal[buyer] += total / 2;

        emit DisputeResolved(_roomId, address(0), total);
    }

    function disputeTimeoutResolve(uint256 _roomId) external nonReentrant
        inState(_roomId, State.Disputed)
    {
        BondRoom storage room = rooms[_roomId];
        require(block.timestamp >= room.disputedAt + DISPUTE_TIMEOUT, "Arbiter still has time");

        address seller = room.creatorIsSeller ? room.creator : room.counterparty;
        uint256 amount = room.valueInContract;
        room.valueInContract = 0;
        room.state = State.Released;
        _deactivate(room);

        (bool ok, ) = seller.call{value: amount}("");
        require(ok, "Timeout release failed");

        emit DisputeResolved(_roomId, room.creator, amount);
    }

    function withdraw() external nonReentrant {
        uint256 amount = pendingWithdrawal[msg.sender];
        require(amount > 0, "Nothing to withdraw");
        pendingWithdrawal[msg.sender] = 0;

        (bool ok, ) = payable(msg.sender).call{value: amount}("");
        require(ok, "Withdraw failed");

        emit Withdrawn(msg.sender, amount);
    }

    function cancelRoom(uint256 _roomId) external nonReentrant
        inState(_roomId, State.Created)
    {
        require(msg.sender == rooms[_roomId].creator, "Not creator");
        rooms[_roomId].state = State.Cancelled;
        activeRoomCount[msg.sender]--;
        emit RoomCancelled(_roomId, msg.sender);
    }

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
        emit RoomExpired(_roomId);
    }

    function getRoom(uint256 _roomId) external view returns (
        address creator,
        address counterparty,
        bool creatorIsSeller,
        string memory itemDescription,
        uint256 priceUSD,
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

    receive() external payable { revert("Use fundRoom"); }
}
