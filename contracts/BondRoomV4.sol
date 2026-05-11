// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

contract BondRoomV4 is ReentrancyGuard {
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
        uint256 sellerTimeout;
        uint256 autoReleaseDelay;
        Status  status;
    }

    IERC20 public immutable usdc;
    address public treasury;
    uint256 public constant TAX_BPS = 100; // 1%
    uint256 public constant BPS_DENOM = 10_000;

    // Join fee (anti-spam, refunded on success)
    uint256 public constant JOIN_FEE = 0.1e6; // 0.1 USDC (6 decimals)

    // Timers
    uint256 public constant DEFAULT_SELLER_TIMEOUT = 6 hours;
    uint256 public constant DEFAULT_AUTO_RELEASE   = 4 hours;
    uint256 public constant DISPUTE_WINDOW          = 2 hours;
    uint256 public constant STALE_ROOM_EXPIRY       = 4 hours;
    uint256 public constant DISPUTE_AUTO_REFUND     = 24 hours;

    // Custom timer bounds
    uint256 public constant MIN_SELLER_TIMEOUT = 30 minutes;
    uint256 public constant MAX_SELLER_TIMEOUT = 24 hours;
    uint256 public constant MIN_AUTO_RELEASE   = 30 minutes;
    uint256 public constant MAX_AUTO_RELEASE   = 12 hours;

    uint256 public constant MAX_ACTIVE_ROOMS = 10;

    uint256 public totalRooms;
    mapping(uint256 => Room) public rooms;
    mapping(address => uint256) public activeRooms;

    event RoomCreated(uint256 indexed id, address indexed maker, string item, uint256 price, bool makerIsSeller);
    event RoomJoined(uint256 indexed id, address indexed counter);
    event Funded(uint256 indexed id);
    event Delivered(uint256 indexed id);
    event Released(uint256 indexed id, address seller, uint256 amount);
    event Refunded(uint256 indexed id, address buyer, uint256 amount);
    event Disputed(uint256 indexed id, address indexed by);
    event RoomExpired(uint256 indexed id);
    event FeeRefunded(uint256 indexed id, address to);

    modifier onlySeller(uint256 id) {
        Room storage r = rooms[id];
        require(msg.sender == (r.makerIsSeller ? r.maker : r.counter), "not seller");
        _;
    }

    modifier onlyBuyer(uint256 id) {
        Room storage r = rooms[id];
        require(msg.sender == (r.makerIsSeller ? r.counter : r.maker), "not buyer");
        _;
    }

    function getSeller(uint256 id) public view returns (address) {
        return rooms[id].makerIsSeller ? rooms[id].maker : rooms[id].counter;
    }

    function getBuyer(uint256 id) public view returns (address) {
        return rooms[id].makerIsSeller ? rooms[id].counter : rooms[id].maker;
    }

    constructor(address _usdc, address _treasury) {
        usdc = IERC20(_usdc);
        treasury = _treasury;
    }

    // ─── Core Flow ─────────────────────────────────────────────

    /// @notice Create room — FREE, no fees
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
        require(_price > 0, "price = 0");
        require(bytes(_item).length >= 1, "item too short");
        require(bytes(_item).length <= 200, "item too long");
        require(activeRooms[msg.sender] < MAX_ACTIVE_ROOMS, "too many active rooms");

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
            sellerTimeout: _sellerTimeout,
            autoReleaseDelay: _autoReleaseDelay,
            status: Status.WAITING
        });

        activeRooms[msg.sender]++;
        emit RoomCreated(id, msg.sender, _item, _price, _makerIsSeller);
        return id;
    }

    /// @notice Join room — pay 0.1 USDC join fee (refunded on success)
    function joinRoom(uint256 id) external nonReentrant {
        Room storage r = rooms[id];
        require(r.status == Status.WAITING, "not waiting");
        require(r.counter == address(0), "already joined");
        require(msg.sender != r.maker, "cannot join own room");
        require(block.timestamp < r.createdAt + STALE_ROOM_EXPIRY, "room expired");

        // Collect join fee (refunded if deal succeeds)
        require(usdc.transferFrom(msg.sender, treasury, JOIN_FEE), "join fee failed");

        r.counter = msg.sender;
        activeRooms[msg.sender]++;
        emit RoomJoined(id, msg.sender);
    }

    function fundRoom(uint256 id) external nonReentrant onlyBuyer(id) {
        Room storage r = rooms[id];
        require(r.status == Status.WAITING, "not waiting");
        require(r.counter != address(0), "counter not joined");
        require(block.timestamp < r.createdAt + STALE_ROOM_EXPIRY, "room expired");

        // CEI: effects before interactions
        r.fundedAt = block.timestamp;
        r.status = Status.FUNDED;
        require(usdc.transferFrom(msg.sender, address(this), r.total), "transfer failed");

        emit Funded(id);
    }

    function markDelivered(uint256 id) external nonReentrant onlySeller(id) {
        Room storage r = rooms[id];
        require(r.status == Status.FUNDED, "not funded");

        r.deliveredAt = block.timestamp;
        r.status = Status.DELIVERED;
        emit Delivered(id);
    }

    function releaseRoom(uint256 id) external nonReentrant onlyBuyer(id) {
        Room storage r = rooms[id];
        require(r.status == Status.DELIVERED, "not delivered");
        _release(id);
    }

    function autoRelease(uint256 id) external nonReentrant {
        Room storage r = rooms[id];
        require(r.status == Status.DELIVERED, "not delivered");
        require(block.timestamp >= r.deliveredAt + r.autoReleaseDelay, "too early");
        _release(id);
    }

    function dispute(uint256 id) external nonReentrant onlyBuyer(id) {
        Room storage r = rooms[id];
        require(r.status == Status.DELIVERED, "not delivered");
        require(block.timestamp < r.deliveredAt + DISPUTE_WINDOW, "dispute window closed");

        r.status = Status.DISPUTED;
        emit Disputed(id, msg.sender);
    }

    function refundRoom(uint256 id) external nonReentrant onlyBuyer(id) {
        Room storage r = rooms[id];

        if (r.status == Status.FUNDED) {
            require(block.timestamp >= r.fundedAt + r.sellerTimeout, "seller timeout not reached");
            _refund(id);
        } else if (r.status == Status.DISPUTED) {
            require(block.timestamp >= r.deliveredAt + DISPUTE_AUTO_REFUND, "dispute not resolved yet");
            _refund(id);
        } else {
            revert("cannot refund");
        }
    }

    function sellerAcceptDispute(uint256 id) external nonReentrant onlySeller(id) {
        Room storage r = rooms[id];
        require(r.status == Status.DISPUTED, "not disputed");
        _refund(id);
    }

    function expireRoom(uint256 id) external nonReentrant {
        Room storage r = rooms[id];
        require(r.status == Status.WAITING, "not waiting");
        require(r.counter == address(0), "already joined");
        require(block.timestamp >= r.createdAt + STALE_ROOM_EXPIRY, "not expired yet");

        r.status = Status.EXPIRED;
        activeRooms[r.maker]--;
        emit RoomExpired(id);
    }

    // ─── Internal ──────────────────────────────────────────────

    function _release(uint256 id) internal {
        Room storage r = rooms[id];
        address seller = getSeller(id);

        r.status = Status.RELEASED;
        activeRooms[r.maker]--;
        activeRooms[r.counter]--;

        // Tax to treasury
        if (r.tax > 0) usdc.transfer(treasury, r.tax);
        // Price to seller
        usdc.transfer(seller, r.price);
        // Refund join fee to counter (reward for completing the deal)
        usdc.transfer(r.counter, JOIN_FEE);

        emit Released(id, seller, r.price);
    }

    function _refund(uint256 id) internal {
        Room storage r = rooms[id];
        address buyer = getBuyer(id);

        r.status = Status.REFUNDED;
        activeRooms[r.maker]--;
        activeRooms[r.counter]--;

        // Refund total to buyer
        usdc.transfer(buyer, r.total);
        // Join fee stays in treasury (spammer penalty)

        emit Refunded(id, buyer, r.total);
    }

    // ─── View Helpers ──────────────────────────────────────────

    function getRoom(uint256 id) external view returns (
        address maker, address counter, bool makerIsSeller,
        string memory item, uint256 price, uint256 tax, uint256 total,
        uint256 sellerTimeout, uint256 autoReleaseDelay, Status status
    ) {
        Room storage r = rooms[id];
        return (r.maker, r.counter, r.makerIsSeller, r.item, r.price, r.tax, r.total, r.sellerTimeout, r.autoReleaseDelay, r.status);
    }

    function canRelease(uint256 id) external view returns (bool) {
        return rooms[id].status == Status.DELIVERED;
    }
    function canAutoRelease(uint256 id) external view returns (bool) {
        Room storage r = rooms[id];
        return r.status == Status.DELIVERED && block.timestamp >= r.deliveredAt + r.autoReleaseDelay;
    }
    function canRefund(uint256 id) external view returns (bool) {
        Room storage r = rooms[id];
        if (r.status == Status.FUNDED) return block.timestamp >= r.fundedAt + r.sellerTimeout;
        if (r.status == Status.DISPUTED) return block.timestamp >= r.deliveredAt + DISPUTE_AUTO_REFUND;
        return false;
    }
    function canDispute(uint256 id) external view returns (bool) {
        Room storage r = rooms[id];
        return r.status == Status.DELIVERED && block.timestamp < r.deliveredAt + DISPUTE_WINDOW;
    }
    function timeUntilAutoRelease(uint256 id) external view returns (uint256) {
        Room storage r = rooms[id];
        if (r.status != Status.DELIVERED) return 0;
        uint256 d = r.deliveredAt + r.autoReleaseDelay;
        return block.timestamp >= d ? 0 : d - block.timestamp;
    }
    function timeUntilRefund(uint256 id) external view returns (uint256) {
        Room storage r = rooms[id];
        if (r.status == Status.FUNDED) {
            uint256 d = r.fundedAt + r.sellerTimeout;
            return block.timestamp >= d ? 0 : d - block.timestamp;
        }
        if (r.status == Status.DISPUTED) {
            uint256 d = r.deliveredAt + DISPUTE_AUTO_REFUND;
            return block.timestamp >= d ? 0 : d - block.timestamp;
        }
        return 0;
    }

    function setTreasury(address _treasury) external {
        treasury = _treasury;
    }
}
