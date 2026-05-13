// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

interface IUSDC {
    function transfer(address to, uint256 amount) external returns (bool);
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
    function approve(address spender, uint256 amount) external returns (bool);
}

/// @title BondRoom V15 — Standard ERC-20 escrow (approve + transferFrom)
/// Arc docs: "DeFi protocols: Interact with USDC through the ERC-20 interface only"
contract BondRoomV15 {
    enum State { Created, Joined, Funded, Delivered, Released, Disputed, Refunded, Expired, Cancelled }

    IUSDC public immutable usdc;
    address public immutable treasury;
    address public immutable arbiter;
    string public arbiterName;
    uint256 public constant FUND_TAX_BPS = 100; // 1%
    uint256 public constant BPS_DENOM = 10000;
    uint256 public constant MAX_ACTIVE = 3;
    uint256 public constant JOIN_DL = 1 hours;
    uint256 public constant FUND_DL = 30 minutes;
    uint256 public constant DELIVER_DL = 4 hours;
    uint256 public constant AUTO_RELEASE = 2 hours;

    struct BondRoom {
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
        State state;
        uint256 fundedAmount;
        uint256 platformFee;
        bytes32 joinCodeHash;
        bytes32 deliveryProofHash;
    }

    mapping(uint256 => BondRoom) public rooms;
    uint256 public roomCount;
    mapping(address => uint256) public activeRooms;

    uint256 private _lk = 1;
    modifier nonReentrant() { require(_lk == 1); _lk = 2; _; _lk = 1; }

    event RoomCreated(uint256 indexed id, address indexed creator, string item, uint256 price, uint256 collateral, bool creatorIsSeller);
    event RoomJoined(uint256 indexed id, address indexed who);
    event RoomFunded(uint256 indexed id, uint256 amount, uint256 fee);
    event RoomDelivered(uint256 indexed id, bytes32 proof);
    event RoomReleased(uint256 indexed id, uint256 amount, uint256 collateral);
    event RoomDisputed(uint256 indexed id);
    event RoomRefunded(uint256 indexed id, uint256 amount, uint256 collateral);
    event RoomExpired(uint256 indexed id);
    event RoomCancelled(uint256 indexed id, address indexed by);
    event DisputeResolved(uint256 indexed id, address indexed winner, uint256 amount);

    modifier onlySeller(uint256 id) {
        require(msg.sender == _seller(id), "!seller"); _;
    }
    modifier onlyBuyer(uint256 id) {
        require(msg.sender == _buyer(id), "!buyer"); _;
    }
    modifier onlyArbiter() { require(msg.sender == arbiter); _; }
    modifier inState(uint256 id, State s) { require(rooms[id].state == s); _; }

    function _seller(uint256 id) internal view returns (address) {
        BondRoom storage r = rooms[id];
        return r.creatorIsSeller ? r.creator : r.counterparty;
    }
    function _buyer(uint256 id) internal view returns (address) {
        BondRoom storage r = rooms[id];
        return r.creatorIsSeller ? r.counterparty : r.creator;
    }

    constructor(address _usdc, address _treasury, address _arbiter, string memory _name) {
        require(_usdc != address(0) && _treasury != address(0) && _arbiter != address(0));
        usdc = IUSDC(_usdc); treasury = _treasury; arbiter = _arbiter; arbiterName = _name;
    }

    // ═══ ROOMS ═══

    function createRoom(string calldata _item, uint256 _price, uint256 _collateral,
        bytes32 _codeHash, bool _isSeller) external nonReentrant returns (uint256)
    {
        require(_price > 0 && bytes(_item).length > 0 && bytes(_item).length <= 500);
        require(_codeHash != bytes32(0));
        require(activeRooms[msg.sender] < MAX_ACTIVE);

        // Pull collateral from seller (if any)
        if (_collateral > 0) {
            address seller = _isSeller ? msg.sender : address(0); // counterparty joins later
            // collateral pulled at create time if seller creates
            if (_isSeller) {
                require(usdc.transferFrom(msg.sender, address(this), _collateral), "collateral transfer failed");
            }
        }

        uint256 id = roomCount++;
        rooms[id] = BondRoom({
            creator: msg.sender, counterparty: address(0),
            creatorIsSeller: _isSeller, itemDescription: _item,
            priceUSD: _price, collateralAmount: _collateral,
            createdAt: uint32(block.timestamp), joinedAt: 0,
            deliveredAt: 0, disputedAt: 0, state: State.Created,
            fundedAmount: 0, platformFee: 0,
            joinCodeHash: _codeHash, deliveryProofHash: bytes32(0)
        });
        activeRooms[msg.sender]++;
        emit RoomCreated(id, msg.sender, _item, _price, _collateral, _isSeller);
        return id;
    }

    function joinRoom(uint256 id, bytes calldata _code) external nonReentrant inState(id, State.Created) {
        BondRoom storage r = rooms[id];
        require(msg.sender != r.creator && keccak256(_code) == r.joinCodeHash);
        require(activeRooms[msg.sender] < MAX_ACTIVE);
        require(block.timestamp < r.createdAt + JOIN_DL);

        // If buyer creates and seller joins → pull collateral from seller now
        if (!r.creatorIsSeller && r.collateralAmount > 0) {
            require(usdc.transferFrom(msg.sender, address(this), r.collateralAmount), "collateral transfer failed");
        }

        r.counterparty = msg.sender;
        r.joinedAt = uint32(block.timestamp);
        r.state = State.Joined;
        activeRooms[msg.sender]++;
        emit RoomJoined(id, msg.sender);
    }

    function fundRoom(uint256 id) external nonReentrant onlyBuyer(id) inState(id, State.Joined) {
        BondRoom storage r = rooms[id];
        require(block.timestamp < r.joinedAt + FUND_DL);
        uint256 exact = (r.priceUSD * BPS_DENOM) / (BPS_DENOM - FUND_TAX_BPS);
        uint256 fee = (exact * FUND_TAX_BPS) / BPS_DENOM;

        // Pull exact amount from buyer (price + fee)
        require(usdc.transferFrom(msg.sender, address(this), exact), "fund transfer failed");
        // Send fee to treasury
        if (fee > 0) {
            require(usdc.transfer(treasury, fee), "fee transfer failed");
        }
        r.fundedAmount = r.priceUSD;
        r.platformFee = fee;
        r.state = State.Funded;
        emit RoomFunded(id, r.priceUSD, fee);
    }

    function markDelivered(uint256 id, bytes32 _p) external nonReentrant onlySeller(id) inState(id, State.Funded) {
        rooms[id].state = State.Delivered;
        rooms[id].deliveredAt = uint32(block.timestamp);
        rooms[id].deliveryProofHash = _p;
        emit RoomDelivered(id, _p);
    }

    // ═══ SETTLEMENT ═══

    function releaseFunds(uint256 id) external nonReentrant onlyBuyer(id) inState(id, State.Delivered) {
        BondRoom storage r = rooms[id];
        address seller = _seller(id);
        address buyer = _buyer(id);
        uint256 price = r.fundedAmount;
        uint256 collat = r.collateralAmount;
        _closeRoom(r, seller, buyer);
        // Seller gets price + collateral
        if (price + collat > 0) require(usdc.transfer(seller, price + collat), "release failed");
        emit RoomReleased(id, price, collat);
    }

    function dispute(uint256 id) external nonReentrant onlyBuyer(id) inState(id, State.Delivered) {
        rooms[id].state = State.Disputed;
        rooms[id].disputedAt = uint32(block.timestamp);
        emit RoomDisputed(id);
    }

    function buyerRefund(uint256 id) external nonReentrant onlyBuyer(id) inState(id, State.Funded) {
        BondRoom storage r = rooms[id];
        require(block.timestamp >= r.joinedAt + DELIVER_DL);
        address seller = _seller(id);
        address buyer = _buyer(id);
        uint256 price = r.fundedAmount;
        uint256 collat = r.collateralAmount;
        _closeRoom(r, seller, buyer);
        // Buyer gets price + collateral back
        if (price + collat > 0) require(usdc.transfer(buyer, price + collat), "refund failed");
        emit RoomRefunded(id, price, collat);
    }

    function autoRelease(uint256 id) external nonReentrant inState(id, State.Delivered) {
        BondRoom storage r = rooms[id];
        address seller = _seller(id);
        address buyer = _buyer(id);
        require(msg.sender == seller || msg.sender == buyer);
        require(block.timestamp >= r.deliveredAt + AUTO_RELEASE);
        uint256 price = r.fundedAmount;
        uint256 collat = r.collateralAmount;
        _closeRoom(r, seller, buyer);
        if (price + collat > 0) require(usdc.transfer(seller, price + collat), "release failed");
        emit RoomReleased(id, price, collat);
    }

    function arbiterResolve(uint256 id, address _w) external nonReentrant onlyArbiter inState(id, State.Disputed) {
        BondRoom storage r = rooms[id];
        address seller = _seller(id);
        address buyer = _buyer(id);
        require(_w == seller || _w == buyer);
        uint256 price = r.fundedAmount;
        uint256 collat = r.collateralAmount;
        _closeRoom(r, seller, buyer);
        if (price + collat > 0) require(usdc.transfer(_w, price + collat), "resolve failed");
        emit DisputeResolved(id, _w, price + collat);
    }

    function arbiterSplit(uint256 id) external nonReentrant onlyArbiter inState(id, State.Disputed) {
        BondRoom storage r = rooms[id];
        address seller = _seller(id);
        address buyer = _buyer(id);
        uint256 total = r.fundedAmount + r.collateralAmount;
        _closeRoom(r, seller, buyer);
        uint256 half = total / 2;
        if (half > 0) require(usdc.transfer(seller, half), "split failed");
        if (total - half > 0) require(usdc.transfer(buyer, total - half), "split failed");
        emit DisputeResolved(id, address(0), total);
    }

    function _closeRoom(BondRoom storage r, address seller, address buyer) internal {
        r.fundedAmount = 0;
        r.collateralAmount = 0;
        r.state = State.Released; // overridden by caller
        activeRooms[r.creator]--;
        if (r.counterparty != address(0)) activeRooms[r.counterparty]--;
    }

    // ═══ CANCEL / EXPIRE ═══

    function cancelRoom(uint256 id) external nonReentrant inState(id, State.Created) {
        require(msg.sender == rooms[id].creator);
        BondRoom storage r = rooms[id];
        r.state = State.Cancelled;
        activeRooms[msg.sender]--;
        // Return collateral to creator
        if (r.collateralAmount > 0 && r.creatorIsSeller) {
            require(usdc.transfer(msg.sender, r.collateralAmount), "cancel refund failed");
        }
        r.collateralAmount = 0;
        emit RoomCancelled(id, msg.sender);
    }

    function leaveRoom(uint256 id) external nonReentrant {
        BondRoom storage r = rooms[id];
        require(r.state == State.Joined);
        require(msg.sender == r.creator || msg.sender == r.counterparty);
        require(block.timestamp < r.joinedAt + FUND_DL);
        r.state = State.Cancelled;
        activeRooms[r.creator]--;
        if (r.counterparty != address(0)) activeRooms[r.counterparty]--;
        // Return collateral to whoever paid it
        if (r.collateralAmount > 0) {
            address s = r.creatorIsSeller ? r.creator : r.counterparty;
            if (s != address(0)) require(usdc.transfer(s, r.collateralAmount), "leave refund failed");
        }
        r.collateralAmount = 0;
        emit RoomCancelled(id, msg.sender);
    }

    function expireRoom(uint256 id) external nonReentrant {
        BondRoom storage r = rooms[id];
        if (r.state == State.Created) {
            require(block.timestamp >= r.createdAt + JOIN_DL);
            activeRooms[r.creator]--;
        } else if (r.state == State.Joined) {
            require(block.timestamp >= r.joinedAt + FUND_DL);
            activeRooms[r.creator]--;
            activeRooms[r.counterparty]--;
        } else revert("bad state");
        r.state = State.Expired;
        // Return collateral to whoever paid it
        if (r.collateralAmount > 0) {
            address s = r.creatorIsSeller ? r.creator : r.counterparty;
            if (s != address(0)) require(usdc.transfer(s, r.collateralAmount), "expire refund failed");
        }
        r.collateralAmount = 0;
        emit RoomExpired(id);
    }

    // ═══ VIEW ═══

    function getRoom(uint256 id) external view returns (
        address creator, address counterparty, bool creatorIsSeller,
        string memory itemDescription, uint256 priceUSD, uint256 collateralAmount,
        uint32 createdAt, uint32 joinedAt, uint32 deliveredAt, uint32 disputedAt,
        uint8 state, uint256 fundedAmount, uint256 platformFee, bytes32 deliveryProofHash
    ) {
        BondRoom storage r = rooms[id];
        return (r.creator, r.counterparty, r.creatorIsSeller, r.itemDescription,
            r.priceUSD, r.collateralAmount, r.createdAt, r.joinedAt, r.deliveredAt,
            r.disputedAt, uint8(r.state), r.fundedAmount, r.platformFee, r.deliveryProofHash);
    }

    function verifyJoinCode(uint256 id, bytes calldata _c) external view returns (bool) {
        return keccak256(_c) == rooms[id].joinCodeHash;
    }

    function contractBalance() external view returns (uint256) {
        return usdc.balanceOf(address(this));
    }
}
