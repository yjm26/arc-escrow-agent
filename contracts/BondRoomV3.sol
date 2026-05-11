// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/**
 * @title BondRoomV3
 * @notice Trustless escrow with fast timers, anti-griefing, anti-spam
 */
contract BondRoomV3 {
    enum Status { EMPTY, WAITING, FUNDED, DELIVERED, RELEASED, REFUNDED, DISPUTED, EXPIRED }

    struct Room {
        address maker;
        address counter;
        bool    makerIsSeller;
        string  item;
        uint256 price;
        uint256 tax;
        uint256 total;
        uint256 createdAt;
        uint256 fundedAt;
        uint256 deliveredAt;
        uint256 disputedAt;
        uint256 sellerTimeout;       // seconds: seller must deliver before buyer can refund
        uint256 autoReleaseDelay;    // seconds: after delivery, auto-release window
        Status  status;
    }

    IERC20 public immutable usdc;
    address public immutable treasury;
    uint256 public constant TAX_BPS = 100;         // 1%
    uint256 public constant BPS_DENOM = 10_000;

    // Timers (all in seconds)
    uint256 public constant DEFAULT_SELLER_TIMEOUT  = 6 hours;
    uint256 public constant DEFAULT_AUTO_RELEASE    = 4 hours;
    uint256 public constant DISPUTE_WINDOW          = 2 hours;
    uint256 public constant STALE_TIMEOUT           = 4 hours;    // unjoined room expires
    uint256 public constant DISPUTE_AUTO_REFUND     = 24 hours;   // dispute → auto refund

    // Bounds for custom timers
    uint256 public constant MIN_SELLER_TIMEOUT = 30 minutes;
    uint256 public constant MAX_SELLER_TIMEOUT = 24 hours;
    uint256 public constant MIN_AUTO_RELEASE   = 30 minutes;
    uint256 public constant MAX_AUTO_RELEASE   = 12 hours;

    // Anti-spam
    uint256 public constant CREATION_FEE = 0.1e6;  // 0.1 USDC (refundable)
    uint256 public constant MAX_ACTIVE_ROOMS = 10;

    uint256 public totalRooms;
    mapping(uint256 => Room) public rooms;
    mapping(address => uint256) public activeRooms;  // active room count per address
    mapping(address => uint256[]) public userRooms;  // room IDs per user

    bool private _locked;

    event RoomCreated(uint256 indexed id, address indexed maker, string item, uint256 price, bool makerIsSeller);
    event RoomJoined(uint256 indexed id, address indexed counter);
    event Funded(uint256 indexed id);
    event Delivered(uint256 indexed id);
    event Released(uint256 indexed id, address seller, uint256 amount);
    event Refunded(uint256 indexed id, address buyer, uint256 amount);
    event Disputed(uint256 indexed id, address indexed by);
    event Expired(uint256 indexed id);
    event FeeRefunded(uint256 indexed id, address to, uint256 amount);

    // ─── Modifiers ─────────────────────────────────────────────

    modifier nonReentrant() {
        require(!_locked, "reentrant");
        _locked = true;
        _;
        _locked = false;
    }

    modifier onlySeller(uint256 id) {
        Room storage r = rooms[id];
        address seller = r.makerIsSeller ? r.maker : r.counter;
        require(msg.sender == seller, "not seller");
        _;
    }

    modifier onlyBuyer(uint256 id) {
        Room storage r = rooms[id];
        address buyer = r.makerIsSeller ? r.counter : r.maker;
        require(msg.sender == buyer, "not buyer");
        _;
    }

    modifier validRoom(uint256 id) {
        require(id < totalRooms, "room not found");
        _;
    }

    // ─── Helpers ───────────────────────────────────────────────

    function getSeller(uint256 id) public view returns (address) {
        return rooms[id].makerIsSeller ? rooms[id].maker : rooms[id].counter;
    }

    function getBuyer(uint256 id) public view returns (address) {
        return rooms[id].makerIsSeller ? rooms[id].counter : rooms[id].maker;
    }

    function isActive(address user) public view returns (uint256 count) {
        for (uint256 i = 0; i < userRooms[user].length; i++) {
            uint256 rid = userRooms[user][i];
            Status s = rooms[rid].status;
            if (s == Status.WAITING || s == Status.FUNDED || s == Status.DELIVERED || s == Status.DISPUTED) {
                count++;
            }
        }
    }

    // ─── Constructor ───────────────────────────────────────────

    constructor(address _usdc, address _treasury) {
        require(_usdc != address(0), "zero usdc");
        require(_treasury != address(0), "zero treasury");
        usdc = IERC20(_usdc);
        treasury = _treasury;
    }

    // ─── Core Flow ─────────────────────────────────────────────

    function createRoom(
        string calldata _item,
        uint256 _price,
        bool _makerIsSeller
    ) external nonReentrant returns (uint256) {
        return _createRoom(_item, _price, _makerIsSeller, DEFAULT_SELLER_TIMEOUT, DEFAULT_AUTO_RELEASE);
    }

    function createRoomCustom(
        string calldata _item,
        uint256 _price,
        bool _makerIsSeller,
        uint256 _sellerTimeout,
        uint256 _autoReleaseDelay
    ) external nonReentrant returns (uint256) {
        require(_sellerTimeout >= MIN_SELLER_TIMEOUT && _sellerTimeout <= MAX_SELLER_TIMEOUT, "bad seller timeout");
        require(_autoReleaseDelay >= MIN_AUTO_RELEASE && _autoReleaseDelay <= MAX_AUTO_RELEASE, "bad auto release");
        return _createRoom(_item, _price, _makerIsSeller, _sellerTimeout, _autoReleaseDelay);
    }

    function _createRoom(
        string calldata _item,
        uint256 _price,
        bool _makerIsSeller,
        uint256 _sellerTimeout,
        uint256 _autoReleaseDelay
    ) internal returns (uint256) {
        // Checks
        require(bytes(_item).length > 0, "empty item");
        require(bytes(_item).length <= 200, "item too long");
        require(_price > 0, "price = 0");
        require(isActive(msg.sender) < MAX_ACTIVE_ROOMS, "too many active rooms");

        // Collect creation fee
        require(usdc.transferFrom(msg.sender, address(this), CREATION_FEE), "fee transfer failed");

        // Effects
        uint256 id = totalRooms++;
        uint256 _tax = (_price * TAX_BPS) / BPS_DENOM;

        rooms[id] = Room({
            maker: msg.sender,
            counter: address(0),
            makerIsSeller: _makerIsSeller,
            item: _item,
            price: _price,
            tax: _tax,
            total: _price + _tax,
            createdAt: block.timestamp,
            fundedAt: 0,
            deliveredAt: 0,
            disputedAt: 0,
            sellerTimeout: _sellerTimeout,
            autoReleaseDelay: _autoReleaseDelay,
            status: Status.WAITING
        });

        activeRooms[msg.sender]++;
        userRooms[msg.sender].push(id);

        emit RoomCreated(id, msg.sender, _item, _price, _makerIsSeller);
        return id;
    }

    function joinRoom(uint256 id) external nonReentrant validRoom(id) {
        Room storage r = rooms[id];
        require(r.status == Status.WAITING, "not waiting");
        require(r.counter == address(0), "already joined");
        require(msg.sender != r.maker, "cannot join own room");

        // Check stale timeout
        require(block.timestamp < r.createdAt + STALE_TIMEOUT, "room expired");

        // Collect creation fee from counter too
        require(usdc.transferFrom(msg.sender, address(this), CREATION_FEE), "fee transfer failed");

        r.counter = msg.sender;
        activeRooms[msg.sender]++;
        userRooms[msg.sender].push(id);

        emit RoomJoined(id, msg.sender);
    }

    function fundRoom(uint256 id) external onlyBuyer(id) nonReentrant validRoom(id) {
        Room storage r = rooms[id];
        require(r.status == Status.WAITING, "not waiting");
        require(r.counter != address(0), "counter not joined");
        require(block.timestamp < r.createdAt + STALE_TIMEOUT, "room expired");

        // Interactions
        require(usdc.transferFrom(msg.sender, address(this), r.total), "transfer failed");

        // Effects
        r.fundedAt = block.timestamp;
        r.status = Status.FUNDED;

        emit Funded(id);
    }

    function markDelivered(uint256 id) external onlySeller(id) validRoom(id) {
        Room storage r = rooms[id];
        require(r.status == Status.FUNDED, "not funded");

        r.deliveredAt = block.timestamp;
        r.status = Status.DELIVERED;

        emit Delivered(id);
    }

    function releaseRoom(uint256 id) external onlyBuyer(id) nonReentrant validRoom(id) {
        Room storage r = rooms[id];
        require(r.status == Status.DELIVERED, "not delivered");
        _release(id);
    }

    function autoRelease(uint256 id) external nonReentrant validRoom(id) {
        Room storage r = rooms[id];
        require(r.status == Status.DELIVERED, "not delivered");
        require(block.timestamp >= r.deliveredAt + r.autoReleaseDelay, "too early");
        _release(id);
    }

    function dispute(uint256 id) external onlyBuyer(id) validRoom(id) {
        Room storage r = rooms[id];
        require(r.status == Status.DELIVERED, "not delivered");
        require(block.timestamp < r.deliveredAt + DISPUTE_WINDOW, "dispute window closed");

        r.disputedAt = block.timestamp;
        r.status = Status.DISPUTED;

        emit Disputed(id, msg.sender);
    }

    function refundRoom(uint256 id) external onlyBuyer(id) nonReentrant validRoom(id) {
        Room storage r = rooms[id];

        if (r.status == Status.FUNDED) {
            require(block.timestamp >= r.fundedAt + r.sellerTimeout, "seller timeout not reached");
            _refund(id);
        } else if (r.status == Status.DISPUTED) {
            require(block.timestamp >= r.disputedAt + DISPUTE_AUTO_REFUND, "dispute refund not ready");
            _refund(id);
        } else {
            revert("cannot refund");
        }
    }

    function sellerAcceptDispute(uint256 id) external onlySeller(id) nonReentrant validRoom(id) {
        Room storage r = rooms[id];
        require(r.status == Status.DISPUTED, "not disputed");
        _refund(id);
    }

    function expireStaleRoom(uint256 id) external nonReentrant validRoom(id) {
        Room storage r = rooms[id];
        require(r.status == Status.WAITING, "not waiting");
        require(r.counter == address(0), "already joined");
        require(block.timestamp >= r.createdAt + STALE_TIMEOUT, "not expired yet");

        r.status = Status.EXPIRED;
        _returnFee(id, r.maker);

        emit Expired(id);
    }

    // ─── Internal ──────────────────────────────────────────────

    function _release(uint256 id) internal {
        Room storage r = rooms[id];
        address seller = getSeller(id);
        address buyer = getBuyer(id);

        r.status = Status.RELEASED;
        activeRooms[r.maker] > 0 ? activeRooms[r.maker]-- : activeRooms[r.maker];
        activeRooms[r.counter] > 0 ? activeRooms[r.counter]-- : activeRooms[r.counter];

        // Refund creation fees (both parties completed)
        _returnFee(id, r.maker);
        _returnFee(id, r.counter);

        // Transfer funds
        if (r.tax > 0) usdc.transfer(treasury, r.tax);
        usdc.transfer(seller, r.price);

        emit Released(id, seller, r.price);
    }

    function _refund(uint256 id) internal {
        Room storage r = rooms[id];
        address buyer = getBuyer(id);

        r.status = Status.REFUNDED;
        activeRooms[r.maker] > 0 ? activeRooms[r.maker]-- : activeRooms[r.maker];
        activeRooms[r.counter] > 0 ? activeRooms[r.counter]-- : activeRooms[r.counter];

        // Return buyer's fee, burn maker's fee (griefing penalty)
        _returnFee(id, buyer);

        // Refund total to buyer
        usdc.transfer(buyer, r.total);

        emit Refunded(id, buyer, r.total);
    }

    function _returnFee(uint256 id, address to) internal {
        if (to != address(0)) {
            usdc.transfer(to, CREATION_FEE);
            emit FeeRefunded(id, to, CREATION_FEE);
        }
    }

    // ─── View Helpers ──────────────────────────────────────────

    function getRoom(uint256 id) external view returns (
        address maker,
        address counter,
        bool makerIsSeller,
        string memory item,
        uint256 price,
        uint256 tax,
        uint256 total,
        uint256 sellerTimeout,
        uint256 autoReleaseDelay,
        Status status
    ) {
        Room storage r = rooms[id];
        return (r.maker, r.counter, r.makerIsSeller, r.item, r.price, r.tax, r.total, r.sellerTimeout, r.autoReleaseDelay, r.status);
    }

    function canRelease(uint256 id) external view returns (bool) {
        return rooms[id].status == Status.DELIVERED;
    }

    function canAutoRelease(uint256 id) external view returns (bool) {
        Room storage r = rooms[id];
        return r.status == Status.DELIVERED &&
               block.timestamp >= r.deliveredAt + r.autoReleaseDelay;
    }

    function canRefund(uint256 id) external view returns (bool) {
        Room storage r = rooms[id];
        if (r.status == Status.FUNDED) return block.timestamp >= r.fundedAt + r.sellerTimeout;
        if (r.status == Status.DISPUTED) return block.timestamp >= r.disputedAt + DISPUTE_AUTO_REFUND;
        return false;
    }

    function canDispute(uint256 id) external view returns (bool) {
        Room storage r = rooms[id];
        return r.status == Status.DELIVERED &&
               block.timestamp < r.deliveredAt + DISPUTE_WINDOW;
    }

    function isExpired(uint256 id) external view returns (bool) {
        Room storage r = rooms[id];
        return r.status == Status.WAITING &&
               r.counter == address(0) &&
               block.timestamp >= r.createdAt + STALE_TIMEOUT;
    }

    function timeUntilAutoRelease(uint256 id) external view returns (uint256) {
        Room storage r = rooms[id];
        if (r.status != Status.DELIVERED) return 0;
        uint256 deadline = r.deliveredAt + r.autoReleaseDelay;
        return block.timestamp >= deadline ? 0 : deadline - block.timestamp;
    }

    function timeUntilRefund(uint256 id) external view returns (uint256) {
        Room storage r = rooms[id];
        if (r.status == Status.FUNDED) {
            uint256 deadline = r.fundedAt + r.sellerTimeout;
            return block.timestamp >= deadline ? 0 : deadline - block.timestamp;
        }
        if (r.status == Status.DISPUTED) {
            uint256 deadline = r.disputedAt + DISPUTE_AUTO_REFUND;
            return block.timestamp >= deadline ? 0 : deadline - block.timestamp;
        }
        return 0;
    }

    function timeUntilStaleExpiry(uint256 id) external view returns (uint256) {
        Room storage r = rooms[id];
        if (r.status != Status.WAITING || r.counter != address(0)) return 0;
        uint256 deadline = r.createdAt + STALE_TIMEOUT;
        return block.timestamp >= deadline ? 0 : deadline - block.timestamp;
    }
}
