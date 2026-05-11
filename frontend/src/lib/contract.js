// BondRoom contract — ganti address setelah deploy
export const BONDROOM_ADDRESS = '0x0000000000000000000000000000000000000000'
export const USDC_ADDRESS = '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238'

export const ARC_TESTNET = {
  chainId: 5042002,
  hex: '0x4CE4A2',
  name: 'Arc Testnet',
  rpcUrl: 'https://rpc.testnet.arc.network',
  explorer: 'https://testnet.arcscan.app',
  nativeCurrency: { name: 'USDC', symbol: 'USDC', decimals: 18 },
}

export const BONDROOM_ABI = [
  'function createRoom(string _item, uint256 _price, bool _makerIsSeller) external returns (uint256)',
  'function joinRoom(uint256 id) external',
  'function fundRoom(uint256 id) external',
  'function releaseRoom(uint256 id) external',
  'function refundRoom(uint256 id) external',
  'function getRoom(uint256 id) external view returns (tuple(address maker, address counter, bool makerIsSeller, string item, uint256 price, uint256 tax, uint256 total, uint8 status))',
  'function totalRooms() external view returns (uint256)',
  'function getSeller(uint256 id) external view returns (address)',
  'function getBuyer(uint256 id) external view returns (address)',
  'function treasury() external view returns (address)',
  'function taxBps() external view returns (uint256)',
  'event RoomCreated(uint256 indexed id, address indexed maker, string item, uint256 price, bool makerIsSeller)',
  'event RoomJoined(uint256 indexed id, address indexed counter)',
  'event Funded(uint256 indexed id)',
  'event Released(uint256 indexed id, address seller, uint256 amount)',
  'event Refunded(uint256 indexed id, address buyer, uint256 amount)',
]

export const ERC20_ABI = [
  'function approve(address,uint256) returns (bool)',
  'function allowance(address,address) view returns (uint256)',
  'function balanceOf(address) view returns (uint256)',
]

export const ROOM_STATUS = ['EMPTY', 'WAITING', 'FUNDED', 'RELEASED', 'REFUNDED']
export const ROOM_BADGE = {
  EMPTY:    'bg-neutral-100 text-neutral-400 border-neutral-200',
  WAITING:  'bg-amber-50 text-amber-700 border-amber-200',
  FUNDED:   'bg-blue-50 text-blue-700 border-blue-200',
  RELEASED: 'bg-green-50 text-green-700 border-green-200',
  REFUNDED: 'bg-red-50 text-red-600 border-red-200',
}
