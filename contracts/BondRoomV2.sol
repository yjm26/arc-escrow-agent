// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract BondRoomV2 {
    enum Status { EMPTY, WAITING, FUNDED, DELIVERED, RELEASED, REFUNDED, DISPUTED }

    struct Room {
        address maker;
        address counter;
        bool    makerIsSeller;
        string  item;
        uint256 price;
        uint256 tax;
        uint256 total;
        uint256 fundedAt;
        uint256 deliveredAt;
        uint256 sellerTimeout;      // custom: seconds before buyer can refund if no delivery
        uint256 autoReleaseDelay;   // custom: seconds after delivery before auto-release
        Status  status;
    }

    IERC20 public immutable usdc;
    address public immutable treasury;
    uint256 public constant TAX_BPS = 100;
    uint256 public constant BPS_DENOM = 10_000;

    // Defaults (in seconds) — all under 24h for crypto speed
    uint256 public constant DEFAULT_SELLER_TIMEOUT   = 6 hours;
    uint256 public constant DEFAULT_AUTO_RELEASE     = 4 hours;

    // Min/max bounds
    uint256 public constant MIN_SELLER_TIMEOUT = 30 minutes;
    uint256 public constant MAX_SELLER_TIMEOUT = 24 hours;
    uint256 public constant MIN_AUTO_RELEASE   = 30 minutes;
    uint256 public constant MAX_AUTO_RELEASE   = 12 hours;
    uint256 public constant DISPUTE_WINDOW      = 2 hours;

    uint256 public totalRooms;
    mapping(uint256 => Room) public rooms;

    event RoomCreated(uint256 indexed id, address indexed maker, string item, uint256 price, bool makerIsSeller);
    event RoomJoined(uint256 indexed id, address indexed counter);
    event Funded(uint256 indexed id);
    event Delivered(uint256 indexed id);
    event Released(uint256 indexed id, address seller, uint256 amount);
    event Refunded(uint256 indexed id, address buyer, uint256 amount);
    event Disputed(uint256 indexed id, address indexed by);

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

    constructor(address _usdc, address _treasury) {
        usdc = IERC20(_usdc);
        treasury = _treasury;
    }

    function getSeller(uint256 id) public view returns (address) {
        Room storage r = rooms[id];
        return r.makerIsSeller ? r.maker : r.counter;
    }

    function getBuyer(uint256 id) public view returns (address) {
        Room storage r = rooms[id];
        return r.makerIsSeller ? r.counter : r.maker;
    }

    // ─── Core Flow ─────────────────────────────────────────────

    /// @notice Create a room with default timeouts
    function createRoom(
        string calldata _item,
        uint256 _price,
        bool _makerIsSeller
    ) external returns (uint256) {
        return _createRoom(_item, _price, _makerIsSeller, DEFAULT_SELLER_TIMEOUT, DEFAULT_AUTO_RELEASE);
    }

    /// @notice Create a room with custom timeouts
    function createRoomCustom(
        string calldata _item,
        uint256 _price,
        bool _makerIsSeller,
        uint256 _sellerTimeout,
        uint256 _autoReleaseDelay
    ) external returns (uint256) {
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
            fundedAt: 0,
            deliveredAt: 0,
            sellerTimeout: _sellerTimeout,
            autoReleaseDelay: _autoReleaseDelay,
            status: Status.WAITING
        });

        emit RoomCreated(id, msg.sender, _item, _price, _makerIsSeller);
        return id;
    }

    function joinRoom(uint256 id) external {
        Room storage r = rooms[id];
        require(r.status == Status.WAITING, "not waiting");
        require(r.counter == address(0), "already joined");
        require(msg.sender != r.maker, "cannot join own room");

        r.counter = msg.sender;
        emit RoomJoined(id, msg.sender);
    }

    function fundRoom(uint256 id) external onlyBuyer(id) {
        Room storage r = rooms[id];
        require(r.status == Status.WAITING, "not waiting");
        require(r.counter != address(0), "counter not joined");

        require(usdc.transferFrom(msg.sender, address(this), r.total), "transfer failed");

        r.fundedAt = block.timestamp;
        r.status = Status.FUNDED;
        emit Funded(id);
    }

    function markDelivered(uint256 id) external onlySeller(id) {
        Room storage r = rooms[id];
        require(r.status == Status.FUNDED, "not funded");

        r.deliveredAt = block.timestamp;
        r.status = Status.DELIVERED;
        emit Delivered(id);
    }

    /// @notice Buyer confirms receipt → release instantly
    function releaseRoom(uint256 id) external onlyBuyer(id) {
        Room storage r = rooms[id];
        require(r.status == Status.DELIVERED, "not delivered");
        _release(id);
    }

    /// @notice Auto-release after delay (anyone can call)
    function autoRelease(uint256 id) external {
        Room storage r = rooms[id];
        require(r.status == Status.DELIVERED, "not delivered");
        require(block.timestamp >= r.deliveredAt + r.autoReleaseDelay, "too early");
        _release(id);
    }

    /// @notice Buyer disputes within window
    function dispute(uint256 id) external onlyBuyer(id) {
        Room storage r = rooms[id];
        require(r.status == Status.DELIVERED, "not delivered");
        require(block.timestamp < r.deliveredAt + DISPUTE_WINDOW, "dispute window closed");

        r.status = Status.DISPUTED;
        emit Disputed(id, msg.sender);
    }

    /// @notice Refund — seller timeout or disputed
    function refundRoom(uint256 id) external onlyBuyer(id) {
        Room storage r = rooms[id];

        if (r.status == Status.FUNDED) {
            require(block.timestamp >= r.fundedAt + r.sellerTimeout, "seller timeout not reached");
            _refund(id);
        } else if (r.status == Status.DISPUTED) {
            _refund(id);
        } else {
            revert("cannot refund");
        }
    }

    function sellerAcceptDispute(uint256 id) external onlySeller(id) {
        Room storage r = rooms[id];
        require(r.status == Status.DISPUTED, "not disputed");
        _refund(id);
    }

    // ─── Internal ──────────────────────────────────────────────

    function _release(uint256 id) internal {
        Room storage r = rooms[id];
        address seller = getSeller(id);
        r.status = Status.RELEASED;
        if (r.tax > 0) usdc.transfer(treasury, r.tax);
        usdc.transfer(seller, r.price);
        emit Released(id, seller, r.price);
    }

    function _refund(uint256 id) internal {
        Room storage r = rooms[id];
        address buyer = getBuyer(id);
        r.status = Status.REFUNDED;
        usdc.transfer(buyer, r.total);
        emit Refunded(id, buyer, r.total);
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
        return r.status == Status.DISPUTED;
    }

    function canDispute(uint256 id) external view returns (bool) {
        Room storage r = rooms[id];
        return r.status == Status.DELIVERED &&
               block.timestamp < r.deliveredAt + DISPUTE_WINDOW;
    }

    function timeUntilAutoRelease(uint256 id) external view returns (uint256) {
        Room storage r = rooms[id];
        if (r.status != Status.DELIVERED) return 0;
        uint256 deadline = r.deliveredAt + r.autoReleaseDelay;
        return block.timestamp >= deadline ? 0 : deadline - block.timestamp;
    }

    function timeUntilRefund(uint256 id) external view returns (uint256) {
        Room storage r = rooms[id];
        if (r.status != Status.FUNDED) return 0;
        uint256 deadline = r.fundedAt + r.sellerTimeout;
        return block.timestamp >= deadline ? 0 : deadline - block.timestamp;
    }

    function disputeWindowEnd(uint256 id) external view returns (uint256) {
        Room storage r = rooms[id];
        if (r.status != Status.DELIVERED) return 0;
        return r.deliveredAt + DISPUTE_WINDOW;
    }
}
