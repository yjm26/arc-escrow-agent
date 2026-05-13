import { ethers } from 'ethers';

export const CONTRACT_ADDRESS = '0x1Ed87FEa4B319044CD4DdcEf08f32D7465F7DbA1'; // BondRoomV17 (reputation + arbiter fee)
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

/// Poll for tx receipt — bypass MetaMask provider, use Arc RPC directly
/// MetaMask's injected provider sometimes returns tx hashes that never land on Arc
export async function waitForTx(walletProvider, txHash, timeoutMs = 120000) {
  // Use direct Arc RPC for reliable receipt polling
  const rpcProvider = new ethers.JsonRpcProvider("https://rpc.testnet.arc.network", 5042002)
  const start = Date.now()
  let attempts = 0
  while (Date.now() - start < timeoutMs) {
    attempts++
    try {
      const receipt = await rpcProvider.getTransactionReceipt(txHash)
      if (receipt) {
        console.log(`TX confirmed after ${attempts} polls (${Date.now() - start}ms)`)
        return receipt
      }
    } catch (e) {
      // Swallow — RPC might be flaky
      if (attempts % 10 === 0) console.warn(`Poll attempt ${attempts}: ${e.message}`)
    }
    await new Promise(r => setTimeout(r, 2000))
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
  "function createRoom(string _item, uint256 _price, uint256 _collateral, bytes32 _joinCodeHash, bool _creatorIsSeller, uint32 _deliveryDays) external",
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
  "function getRoom(uint256 _roomId) external view returns (address creator, address counterparty, bool creatorIsSeller, string itemDescription, uint256 priceUSD, uint256 collateralAmount, uint32 createdAt, uint32 joinedAt, uint32 deliveredAt, uint32 disputedAt, uint32 deliveryDeadline, uint8 state, uint256 fundedAmount, uint256 platformFee, bytes32 deliveryProofHash)",
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
  "function MIN_DELIVERY_DAYS() external view returns (uint256)",
  "function MAX_DELIVERY_DAYS() external view returns (uint256)",
  "function ARBITER_FEE_BPS() external view returns (uint256)",
  "function successCount(address) external view returns (uint256)",
  "function disputeCount(address) external view returns (uint256)",
  "function refundedCount(address) external view returns (uint256)",
  "function collateralMultiplier(address _seller) external view returns (uint256)",
  // Events
  "event RoomCreated(uint256 indexed id, address indexed creator, string item, uint256 price, uint256 collateral, bool creatorIsSeller, uint32 deliveryDeadline)",
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

/// Send USDC — try contract method first, fall back to low-level
export async function sendUsdc(signer, to, amount) {
  try {
    // Try standard ERC-20 transfer via ethers contract
    const usdc = getUsdc(signer)
    const tx = await usdc.transfer(to, amount)
    return await tx.wait()
  } catch (err) {
    console.warn('Standard transfer failed, trying low-level:', err.message)
    // Fallback: low-level call (for precompile that doesn't return bool)
    const data = ethers.AbiCoder.defaultAbiCoder().encode(['address', 'uint256'], [to, amount])
    const tx = await signer.sendTransaction({
      to: USDC_ADDRESS,
      data: '0xa9059cbb' + data.slice(2),
      gasLimit: 100000,
    })
    return tx.wait()
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
