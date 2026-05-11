// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/// @title BondRoom — Trustless escrow for Arc Network
/// @notice Creates invite-link escrow rooms. Either party can be the maker.
contract BondRoom {
    // ─── Data ────────────────────────────────────────────────
    enum Status { Empty, Waiting, Funded, Released, Refunded }

    struct Room {
        address maker;      // siapa yang buat room
        address counter;    // lawan (joiner)
        bool    makerIsSeller; // true = maker jual, counter beli
        string  item;
        uint256 price;      // USDC 6 decimals
        uint256 tax;        // 1 % of price
        uint256 total;      // price + tax
        Status  status;
    }

    IERC20 public immutable token;   // USDC on Arc
    address public treasury;         // tax recipient
    uint256 public taxBps = 100;     // 100 bps = 1 %

    Room[] public rooms;
    uint256 public nextId = 1;       // start from 1 for cleaner links

    // ─── Events ──────────────────────────────────────────────
    event RoomCreated(uint256 indexed id, address indexed maker, string item, uint256 price, bool makerIsSeller);
    event RoomJoined (uint256 indexed id, address indexed counter);
    event Funded     (uint256 indexed id);
    event Released   (uint256 indexed id, address seller, uint256 amount);
    event Refunded   (uint256 indexed id, address buyer,  uint256 amount);

    // ─── Errors ──────────────────────────────────────────────
    error RoomNotFound();
    error NotWaiting();
    error AlreadyJoined();
    error NotCounterParty();
    error NotMaker();
    error ZeroPrice();
    error TransferFailed();

    // ─── Constructor ─────────────────────────────────────────
    constructor(address _token, address _treasury) {
        token    = IERC20(_token);
        treasury = _treasury;
    }

    // ─── Modifiers ───────────────────────────────────────────
    modifier roomExists(uint256 id) {
        if (id >= rooms.length) revert RoomNotFound();
        _;
    }

    // ─── Core Functions ──────────────────────────────────────

    /// @notice Create a new escrow room. `makerIsSeller` = true if you're selling.
    function createRoom(
        string calldata _item,
        uint256 _price,
        bool    _makerIsSeller
    ) external returns (uint256 id) {
        if (_price == 0) revert ZeroPrice();

        uint256 _tax   = (_price * taxBps) / 10_000;
        uint256 _total = _price + _tax;

        id = rooms.length;
        rooms.push(Room({
            maker:         msg.sender,
            counter:       address(0),
            makerIsSeller: _makerIsSeller,
            item:          _item,
            price:         _price,
            tax:           _tax,
            total:         _total,
            status:        Status.Waiting
        }));

        emit RoomCreated(id, msg.sender, _item, _price, _makerIsSeller);
        nextId = id + 1;
    }

    /// @notice Other party joins the room.
    function joinRoom(uint256 id) external roomExists(id) {
        Room storage r = rooms[id];
        if (r.status != Status.Waiting) revert NotWaiting();
        if (r.maker == msg.sender)     revert AlreadyJoined();

        r.counter = msg.sender;
        emit RoomJoined(id, msg.sender);
    }

    /// @notice Buyer deposits USDC into escrow.
    function fundRoom(uint256 id) external roomExists(id) {
        Room storage r = rooms[id];
        if (r.status != Status.Waiting) revert NotWaiting();
        if (r.counter == address(0))   revert NotWaiting();

        // siapa buyer?
        address buyer = r.makerIsSeller ? r.counter : r.maker;
        if (msg.sender != buyer) revert NotCounterParty();

        token.transferFrom(msg.sender, address(this), r.total);
        r.status = Status.Funded;
        emit Funded(id);
    }

    /// @notice Seller approves release — USDC goes to seller, tax to treasury.
    function releaseRoom(uint256 id) external roomExists(id) {
        Room storage r = rooms[id];
        if (r.status != Status.Funded) revert NotWaiting();

        // siapa seller?
        address seller = r.makerIsSeller ? r.maker : r.counter;
        if (msg.sender != seller) revert NotMaker();

        r.status = Status.Released;
        token.transfer(seller,    r.price);
        token.transfer(treasury,  r.tax);
        emit Released(id, seller, r.price);
    }

    /// @notice Buyer can refund if seller hasn't released yet.
    function refundRoom(uint256 id) external roomExists(id) {
        Room storage r = rooms[id];
        if (r.status != Status.Funded) revert NotWaiting();

        address buyer = r.makerIsSeller ? r.counter : r.maker;
        if (msg.sender != buyer) revert NotCounterParty();

        r.status = Status.Refunded;
        token.transfer(buyer, r.total);
        emit Refunded(id, buyer, r.total);
    }

    // ─── View ────────────────────────────────────────────────
    function getRoom(uint256 id) external view returns (Room memory) {
        if (id >= rooms.length) revert RoomNotFound();
        return rooms[id];
    }

    function totalRooms() external view returns (uint256) {
        return rooms.length;
    }

    function getSeller(uint256 id) external view returns (address) {
        Room storage r = rooms[id];
        return r.makerIsSeller ? r.maker : r.counter;
    }

    function getBuyer(uint256 id) external view returns (address) {
        Room storage r = rooms[id];
        return r.makerIsSeller ? r.counter : r.maker;
    }

    function setTreasury(address _treasury) external {
        treasury = _treasury;
    }

    function setTaxBps(uint256 _bps) external {
        taxBps = _bps;
    }
}
