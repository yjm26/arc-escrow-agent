export const ESCROW_ADDRESS = '0xd6f0548Db78d50B210493ED545f4Cd1341C20c0B'
export const USDC_ADDRESS = '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238'

export const ARC_TESTNET = {
  chainId: 5042002,
  hex: '0x4CE4A2',
  name: 'Arc Testnet',
  rpcUrl: 'https://rpc.testnet.arc.network',
  explorer: 'https://testnet.arcscan.app',
  nativeCurrency: { name: 'USDC', symbol: 'USDC', decimals: 18 },
}

export const ESCROW_ABI = [
  'function createDeal(address,uint256,string) external',
  'function fundDeal(uint256) external',
  'function approveDeal(uint256) external',
  'function refundDeal(uint256) external',
  'function getDeal(uint256) external view returns (address,address,uint256,uint8,string)',
  'function totalDeals() external view returns (uint256)',
]

export const ERC20_ABI = [
  'function approve(address,uint256) returns (bool)',
  'function allowance(address,address) view returns (uint256)',
  'function balanceOf(address) view returns (uint256)',
]

export const DEAL_STATUS = ['EMPTY', 'FUNDED', 'COMPLETED', 'REFUNDED']
export const DEAL_BADGE = {
  EMPTY: 'bg-neutral-200 text-neutral-500',
  FUNDED: 'bg-accent/10 text-accent',
  COMPLETED: 'bg-green/10 text-green',
  REFUNDED: 'bg-red/10 text-red',
}
