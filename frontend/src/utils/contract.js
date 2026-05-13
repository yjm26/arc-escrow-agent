import { ethers } from 'ethers';

export const CONTRACT_ADDRESS = '0x59Ab8013D4e65d938Ab83b235956e1881046BfB4'; // BondRoomV15 (ERC-20 approve+transferFrom)
export const USDC_ADDRESS = '0x3600000000000000000000000000000000000000'; // Arc USDC precompile

// Arc-specific gas params — see https://docs.arc.network/arc/references/gas-and-fees
export const ARC_GAS = {
  gasLimit: 300000,
  maxFeePerGas: 25000000000n,        // 25 Gwei (min 20 per docs)
  maxPriorityFeePerGas: 1000000000n,  // 1 Gwei tip
}
export const ARC_GAS_APPROVE = {
  gasLimit: 100000,
  maxFeePerGas: 25000000000n,
  maxPriorityFeePerGas: 1000000000n,
}

/// Poll for tx receipt — bypass MetaMask provider, use Arc RPC directly
/// MetaMask's injected provider sometimes returns tx hashes that never land on Arc
export async function waitForTx(walletProvider, txHash, timeoutMs = 60000) {
  // Use direct Arc RPC for reliable receipt polling (MetaMask provider is unreliable on Arc)
  const rpcProvider = new ethers.JsonRpcProvider("https://rpc.testnet.arc.network", 5042002)
  const start = Date.now()
  while (Date.now() - start < timeoutMs) {
    try {
      const receipt = await rpcProvider.getTransactionReceipt(txHash)
      if (receipt) return receipt
    } catch {}
    await new Promise(r => setTimeout(r, 1500))
  }
  throw new Error(`TX ${txHash} not confirmed within ${timeoutMs/1000}s. Check https://testnet.arcscan.app/tx/${txHash}`)
}

export const USDC_ABI = [
  "function transfer(address to, uint256 amount) external returns (bool)",
  "function transferFrom(address from, address to, uint256 amount) external returns (bool)",
  "function approve(address spender, uint256 amount) external returns (bool)",
  "function balanceOf(address account) external view returns (uint256)",
  "function allowance(address owner, address spender) external view returns (uint256)",
];

export const CONTRACT_ABI = [
  // Room
  "function createRoom(string _item, uint256 _price, uint256 _collateral, bytes32 _joinCodeHash, bool _creatorIsSeller) external",
  "function joinRoom(uint256 _roomId, bytes _joinCode) external",
  "function fundRoom(uint256 _roomId) external",
  "function markDelivered(uint256 _roomId, bytes32 _proofHash) external",
  "function releaseFunds(uint256 _roomId) external",
  "function dispute(uint256 _roomId) external",
  "function buyerRefund(uint256 _roomId) external",
  "function autoRelease(uint256 _roomId) external",
  "function arbiterResolve(uint256 _roomId, address _winner) external",
  "function arbiterSplit(uint256 _roomId) external",
  "function cancelRoom(uint256 _roomId) external",
  "function leaveRoom(uint256 _roomId) external",
  "function expireRoom(uint256 _roomId) external",
  // View
  "function getRoom(uint256 _roomId) external view returns (address creator, address counterparty, bool creatorIsSeller, string itemDescription, uint256 priceUSD, uint256 collateralAmount, uint32 createdAt, uint32 joinedAt, uint32 deliveredAt, uint32 disputedAt, uint8 state, uint256 fundedAmount, uint256 platformFee, bytes32 deliveryProofHash)",
  "function verifyJoinCode(uint256 _roomId, bytes _joinCode) external view returns (bool)",
  "function roomCount() external view returns (uint256)",
  "function usdc() external view returns (address)",
  "function treasury() external view returns (address)",
  "function arbiter() external view returns (address)",
  "function arbiterName() external view returns (string)",
  "function activeRooms(address) external view returns (uint256)",
  "function contractBalance() external view returns (uint256)",
  // Constants
  "function FUND_TAX_BPS() external view returns (uint256)",
  "function BPS_DENOM() external view returns (uint256)",
  "function MAX_ACTIVE() external view returns (uint256)",
  "function JOIN_DL() external view returns (uint256)",
  "function FUND_DL() external view returns (uint256)",
  "function DELIVER_DL() external view returns (uint256)",
  "function AUTO_RELEASE() external view returns (uint256)",
  // Events
  "event RoomCreated(uint256 indexed id, address indexed creator, string item, uint256 price, uint256 collateral, bool creatorIsSeller)",
  "event RoomJoined(uint256 indexed id, address indexed who)",
  "event RoomFunded(uint256 indexed id, uint256 amount, uint256 fee)",
  "event RoomDelivered(uint256 indexed id, bytes32 proof)",
  "event RoomReleased(uint256 indexed id, uint256 amount, uint256 collateral)",
  "event RoomDisputed(uint256 indexed id)",
  "event RoomRefunded(uint256 indexed id, uint256 amount, uint256 collateral)",
  "event RoomExpired(uint256 indexed id)",
  "event RoomCancelled(uint256 indexed id, address indexed by)",
  "event DisputeResolved(uint256 indexed id, address indexed winner, uint256 amount)",
];

export function getContract(signerOrProvider) {
  return new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signerOrProvider);
}

export function getUsdc(signerOrProvider) {
  return new ethers.Contract(USDC_ADDRESS, USDC_ABI, signerOrProvider);
}

const RELAY_URL = import.meta.env.VITE_API_URL || 'https://arc-escrow-agent-production.up.railway.app'

/// Send tx via backend relay — bypasses MetaMask entirely
/// Backend signs with server-side private key and broadcasts to Arc RPC directly
export async function sendArcTx(contract, methodName, args, overrides = {}) {
  const contractAddr = await contract.getAddress()
  const txData = contract.interface.encodeFunctionData(methodName, args)
  
  // Send via backend relay
  const resp = await fetch(`${RELAY_URL}/api/relay-tx`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      to: contractAddr,
      data: txData,
      gasLimit: overrides.gasLimit || 300000,
      maxFeePerGas: Number(overrides.maxFeePerGas || 25000000000n),
      maxPriorityFeePerGas: Number(overrides.maxPriorityFeePerGas || 1000000000n),
    }),
  })
  
  const result = await resp.json()
  if (result.error) throw new Error('Relay failed: ' + result.error)
  
  console.log('Relay tx hash:', result.hash)
  
  // Return a tx-like object with hash and wait()
  return {
    hash: result.hash,
    wait: async () => {
      // Poll relay for receipt
      const start = Date.now()
      while (Date.now() - start < 60000) {
        const r = await fetch(`${RELAY_URL}/api/relay-receipt/${result.hash}`)
        const data = await r.json()
        if (data.confirmed) return { status: data.status, blockNumber: data.blockNumber, logs: data.logs }
        await new Promise(r => setTimeout(r, 1500))
      }
      throw new Error(`Relay tx ${result.hash} not confirmed within 60s`)
    }
  }
}

export const STATE_NAMES = ['Created', 'Joined', 'Funded', 'Delivered', 'Released', 'Disputed', 'Refunded', 'Expired', 'Cancelled'];

export function generateJoinCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 8; i++) code += chars.charAt(Math.floor(Math.random() * chars.length));
  return code;
}

export function hashJoinCode(code) {
  return ethers.solidityPackedKeccak256(['string'], [code]);
}

export function createInviteLink(roomId, joinCode) {
  return `${window.location.origin}/room/${roomId}?code=${joinCode}`;
}
