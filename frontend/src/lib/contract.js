// BondRoomV3 deployed on Arc Testnet
export const BONDROOM_ADDRESS = '0x6ed6811Ac5E237fe660d5a7dd5Bc04Ef71B4Afdc'
export const USDC_ADDRESS = '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238'

export const ARC_TESTNET = {
  chainId: 5042002,
  hex: '0x4cef52',
  name: 'Arc Testnet',
  rpcUrl: 'https://rpc.testnet.arc.network',
  explorer: 'https://testnet.arcscan.app',
  nativeCurrency: { name: 'USDC', symbol: 'USDC', decimals: 18 },
}

export const BONDROOM_ABI = [
  // Write
  'function createRoom(string _item, uint256 _price, bool _makerIsSeller) external returns (uint256)',
  'function createRoomCustom(string _item, uint256 _price, bool _makerIsSeller, uint256 _sellerTimeout, uint256 _autoReleaseDelay) external returns (uint256)',
  'function joinRoom(uint256 id) external',
  'function fundRoom(uint256 id) external',
  'function markDelivered(uint256 id) external',
  'function releaseRoom(uint256 id) external',
  'function autoRelease(uint256 id) external',
  'function dispute(uint256 id) external',
  'function refundRoom(uint256 id) external',
  'function sellerAcceptDispute(uint256 id) external',
  // Read
  'function getRoom(uint256 id) external view returns (address maker, address counter, bool makerIsSeller, string item, uint256 price, uint256 tax, uint256 total, uint256 sellerTimeout, uint256 autoReleaseDelay, uint8 status)',
  'function getSeller(uint256 id) external view returns (address)',
  'function getBuyer(uint256 id) external view returns (address)',
  'function totalRooms() external view returns (uint256)',
  'function treasury() external view returns (address)',
  'function usdc() external view returns (address)',
  // View helpers
  'function canRelease(uint256 id) external view returns (bool)',
  'function canAutoRelease(uint256 id) external view returns (bool)',
  'function canRefund(uint256 id) external view returns (bool)',
  'function canDispute(uint256 id) external view returns (bool)',
  'function timeUntilAutoRelease(uint256 id) external view returns (uint256)',
  'function timeUntilRefund(uint256 id) external view returns (uint256)',
  // Constants
  'function CREATION_FEE() external view returns (uint256)',
  'function DELIVERY_FEE() external view returns (uint256)',
  'function TAX_BPS() external view returns (uint256)',
  'function DEFAULT_SELLER_TIMEOUT() external view returns (uint256)',
  'function DEFAULT_AUTO_RELEASE() external view returns (uint256)',
  'function DISPUTE_WINDOW() external view returns (uint256)',
  'function MIN_SELLER_TIMEOUT() external view returns (uint256)',
  'function MAX_SELLER_TIMEOUT() external view returns (uint256)',
  'function MAX_ACTIVE_ROOMS() external view returns (uint256)',
  // Events
  'event RoomCreated(uint256 indexed id, address indexed maker, string item, uint256 price, bool makerIsSeller)',
  'event RoomJoined(uint256 indexed id, address indexed counter)',
  'event Funded(uint256 indexed id)',
  'event Delivered(uint256 indexed id)',
  'event Released(uint256 indexed id, address seller, uint256 amount)',
  'event Refunded(uint256 indexed id, address buyer, uint256 amount)',
  'event Disputed(uint256 indexed id, address indexed by)',
  'event Expired(uint256 indexed id)',
]

export const ERC20_ABI = [
  'function approve(address,uint256) returns (bool)',
  'function allowance(address,address) view returns (uint256)',
  'function balanceOf(address) view returns (uint256)',
  'function decimals() view returns (uint8)',
]

// Status: EMPTY=0, WAITING=1, FUNDED=2, DELIVERED=3, RELEASED=4, REFUNDED=5, DISPUTED=6, EXPIRED=7
export const ROOM_STATUS = ['EMPTY', 'WAITING', 'FUNDED', 'DELIVERED', 'RELEASED', 'REFUNDED', 'DISPUTED', 'EXPIRED']
export const ROOM_BADGE = {
  EMPTY:    'bg-neutral-100 text-neutral-400 border-neutral-200',
  WAITING:  'bg-amber-50 text-amber-700 border-amber-200',
  FUNDED:   'bg-blue-50 text-blue-700 border-blue-200',
  DELIVERED:'bg-purple-50 text-purple-700 border-purple-200',
  RELEASED: 'bg-green-50 text-green-700 border-green-200',
  REFUNDED: 'bg-red-50 text-red-600 border-red-200',
  DISPUTED: 'bg-orange-50 text-orange-700 border-orange-200',
  EXPIRED:  'bg-neutral-100 text-neutral-400 border-neutral-200',
}
