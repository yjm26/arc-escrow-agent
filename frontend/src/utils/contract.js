import { ethers } from 'ethers';

export const CONTRACT_ADDRESS = '0xADf4c67c0D8b2900fA045B1BDbA5d54c803688E5'; // BondRoomV22
export const USDC_ADDRESS = '0x3600000000000000000000000000000000000000'; // Arc USDC precompile

/// Arc minimum gas params — transactions below 20 Gwei maxFeePerGas stay pending forever
/// See https://docs.arc.network/arc/references/gas-and-fees
export const ARC_GAS = {
  maxFeePerGas: 20000000000n,       // 20 Gwei minimum per Arc docs
  maxPriorityFeePerGas: 1000000000n, // 1 Gwei tip for faster inclusion
}
export const ARC_GAS_APPROVE = {
  maxFeePerGas: 20000000000n,
  maxPriorityFeePerGas: 1000000000n,
}

/// Poll for tx receipt — aggressive polling for Arc's fast deterministic finality
/// Arc blocks finalize quickly; we poll immediately with short intervals.
/// Uses provider.waitForTransaction when available (event-based, faster than polling).
export async function waitForTx(walletProvider, txHash, timeoutMs = 60000) {
  const rpcProvider = new ethers.JsonRpcProvider("https://rpc.testnet.arc.network", 5042002)
  const start = Date.now()

  // Try wallet provider's native waitForTransaction first (event-based, instant)
  if (walletProvider && typeof walletProvider.waitForTransaction === 'function') {
    try {
      const receipt = await walletProvider.waitForTransaction(txHash, 1, timeoutMs)
      if (receipt) return receipt
    } catch { /* fall through to polling */ }
  }

  // Aggressive polling: no initial delay, 300ms intervals
  while (Date.now() - start < timeoutMs) {
    // Check both RPCs in parallel
    const [rpcReceipt, walletReceipt] = await Promise.allSettled([
      rpcProvider.getTransactionReceipt(txHash),
      walletProvider ? walletProvider.getTransactionReceipt(txHash) : Promise.resolve(null),
    ])

    if (rpcReceipt.status === 'fulfilled' && rpcReceipt.value) return rpcReceipt.value
    if (walletReceipt.status === 'fulfilled' && walletReceipt.value) return walletReceipt.value

    await new Promise(r => setTimeout(r, 300))
  }
  throw new Error(`TX ${txHash} not confirmed within ${timeoutMs/1000}s. Check https://testnet.arcscan.app/tx/${txHash}`)
}


// Verify user is on Arc Testnet before sending tx
export async function ensureArcChain(signer) {
  const network = await signer.provider.getNetwork()
  if (network.chainId !== 5042002n) {
    throw new Error(`Wrong network (chain ${network.chainId}). Please switch to Arc Testnet in your wallet.`)
  }
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
  "function createRoom(string _item, uint256 _price, uint256 _collateral, bytes32 _joinCodeHash, bool _creatorIsSeller, uint32 _deliveryDays, uint8 _dealType) external",
  "function joinRoom(uint256 _roomId, bytes _joinCode) external",
  "function fundRoom(uint256 _roomId) external",
  "function markDelivered(uint256 _roomId, bytes32 _proofHash) external",
  "function releaseFunds(uint256 _roomId) external",
  "function openDispute(uint256 _roomId, string _reason, string _evidenceType, string _evidenceDesc, string _evidenceRef) external",
  "function escalateNoResponse(uint256 _roomId) external",
  "function buyerRefund(uint256 _roomId) external",
  "function arbiterResolve(uint256 _roomId, address _winner) external",
  "function arbiterSplit(uint256 _roomId) external",
  "function cancelRoom(uint256 _roomId) external",
  "function expireRoom(uint256 _roomId) external",
  // Mutual cancel
  "function requestMutualCancel(uint256 _roomId) external",
  "function revokeMutualCancel(uint256 _roomId) external",
  "function executeMutualCancel(uint256 _roomId) external",
  "function getMutualCancelStatus(uint256 _roomId) external view returns (bool creatorApproved, bool counterpartyApproved)",
  "function mutualCancelApproved(uint256, address) external view returns (bool)",
  // Evidence views
  "function getEvidenceCount(uint256 _roomId) external view returns (uint256)",
  "function getEvidence(uint256 _roomId, uint256 _index) external view returns (tuple(address submitter, string evidenceType, string description, string evidenceRef, uint256 timestamp))",
  "function getAllEvidence(uint256 _roomId) external view returns (tuple(address submitter, string evidenceType, string description, string evidenceRef, uint256 timestamp)[])",
  // View
  "function rooms(uint256 _roomId) external view returns (address creator, address counterparty, bool creatorIsSeller, string itemDescription, uint256 priceUSD, uint256 collateralAmount, uint32 createdAt, uint32 joinedAt, uint32 deliveredAt, uint32 disputedAt, uint32 deliveryDeadline, uint32 confirmDeadline, uint8 state, uint8 dealType, uint256 fundedAmount, uint256 platformFee, bytes32 deliveryProofHash, bytes32 joinCodeHash)",
  "function verifyJoinCode(uint256 _roomId, bytes _joinCode) external view returns (bool)",
  "function roomCount() external view returns (uint256)",
  "function owner() external view returns (address)",
  "function usdc() external view returns (address)",
  "function treasury() external view returns (address)",
  "function arbiter() external view returns (address)",
  "function arbiterName() external view returns (string)",
  "function activeRooms(address) external view returns (uint256)",
  // Constants
  "function FUND_TAX_BPS() external view returns (uint256)",
  "function BPS_DENOM() external view returns (uint256)",
  "function MAX_ACTIVE() external view returns (uint256)",
  "function JOIN_DL() external view returns (uint256)",
  "function FUND_DL() external view returns (uint256)",
  "function MIN_DELIVERY_DAYS() external view returns (uint256)",
  "function MAX_DELIVERY_DAYS() external view returns (uint256)",
  "function ARBITER_FEE_BPS() external view returns (uint256)",
  "function CONFIRM_INSTANT() external view returns (uint256)",
  "function CONFIRM_EVENT() external view returns (uint256)",
  "function CONFIRM_SERVICE() external view returns (uint256)",
  "function successCount(address) external view returns (uint256)",
  "function disputeCount(address) external view returns (uint256)",
  "function refundedCount(address) external view returns (uint256)",
  "function collateralMultiplier(address _seller) external view returns (uint256)",
  // Events
  "event RoomCreated(uint256 indexed id, address indexed creator, string item, uint256 price, uint256 collateral, bool creatorIsSeller, uint32 deliveryDeadline, uint8 dealType)",
  "event RoomJoined(uint256 indexed id, address indexed who)",
  "event RoomFunded(uint256 indexed id, uint256 amount, uint256 fee)",
  "event RoomDelivered(uint256 indexed id, bytes32 proof)",
  "event RoomReleased(uint256 indexed id, uint256 amount, uint256 collateral)",
  "event RoomDisputed(uint256 indexed id, string reason)",
  "event RoomRefunded(uint256 indexed id, uint256 amount, uint256 collateral)",
  "event RoomExpired(uint256 indexed id)",
  "event RoomCancelled(uint256 indexed id, address indexed by)",
  "event DisputeResolved(uint256 indexed id, address indexed winner, uint256 amount)",
  "event MutualCancelRequested(uint256 indexed id, address indexed by)",
  "event MutualCancelExecuted(uint256 indexed id)",
  "event MutualCancelRevoked(uint256 indexed id, address indexed by)",
  "event EscalatedNoResponse(uint256 indexed id, uint32 confirmDeadline)",
];

export function getContract(signerOrProvider) {
  return new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signerOrProvider);
}

export function getUsdc(signerOrProvider) {
  return new ethers.Contract(USDC_ADDRESS, USDC_ABI, signerOrProvider);
}

// Parse rooms() tuple return into a friendly object
export function parseRoom(raw) {
  return {
    creator: raw[0],
    counterparty: raw[1],
    creatorIsSeller: raw[2],
    itemDescription: raw[3],
    priceUSD: raw[4],
    collateralAmount: raw[5],
    createdAt: raw[6],
    joinedAt: raw[7],
    deliveredAt: raw[8],
    disputedAt: raw[9],
    deliveryDeadline: raw[10],
    confirmDeadline: raw[11],
    state: raw[12],
    dealType: raw[13],
    fundedAmount: raw[14],
    platformFee: raw[15],
    deliveryProofHash: raw[16],
    joinCodeHash: raw[17],
  }
}

export const STATE_NAMES = ['Created', 'Joined', 'Funded', 'Delivered', 'Released', 'Disputed', 'Refunded', 'Expired', 'Cancelled'];

export const DEAL_TYPES = [
  { id: 0, label: 'Instant', desc: 'Discord, accounts, immediate goods', confirmWindow: '24 hours' },
  { id: 1, label: 'Event-based', desc: 'WL spots, NFT, mint-related', confirmWindow: '30 days' },
  { id: 2, label: 'Service', desc: 'Design, dev work', confirmWindow: '7 days' },
];

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

/// Override wallet nonce with on-chain nonce to prevent MetaMask/AppKit desync.
/// Some wallet caches stale nonces after dropped txs, causing all future txs to hang.
/// This patches signer.populateTransaction to use RPC's latest nonce + auto-increment.
export async function fixSignerNonce(signer, provider) {
  const addr = await signer.getAddress()
  let nextNonce = await provider.getTransactionCount(addr, 'latest')
  const originalPopulate = signer.populateTransaction.bind(signer)
  signer.populateTransaction = async (tx) => {
    const populated = await originalPopulate(tx)
    populated.nonce = nextNonce++
    return populated
  }
  return () => { signer.populateTransaction = originalPopulate }
}
