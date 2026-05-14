const { ethers } = require('ethers');
const wallets = require('/root/bond-test-wallets/wallets.json');

const RPC = 'https://rpc.testnet.arc.network';
const CONTRACT = '0xADf4c67c0D8b2900fA045B1BDbA5d54c803688E5';
const USDC = '0x3600000000000000000000000000000000000000';

const ABI = [
  "function createRoom(string _item, uint256 _price, uint256 _collateral, bytes32 _joinCodeHash, bool _creatorIsSeller, uint32 _deliveryDays, uint8 _dealType) external",
  "function joinRoom(uint256 _roomId, bytes _joinCode) external",
  "function fundRoom(uint256 _roomId) external",
  "function markDelivered(uint256 _roomId, bytes32 _proofHash) external",
  "function releaseFunds(uint256 _roomId) external",
  "function cancelRoom(uint256 _roomId) external",
  "function rooms(uint256 _roomId) external view returns (address creator, address counterparty, bool creatorIsSeller, string itemDescription, uint256 priceUSD, uint256 collateralAmount, uint32 createdAt, uint32 joinedAt, uint32 deliveredAt, uint32 disputedAt, uint32 deliveryDeadline, uint32 confirmDeadline, uint8 state, uint8 dealType, uint256 fundedAmount, uint256 platformFee, bytes32 deliveryProofHash, bytes32 joinCodeHash)",
  "function activeRooms(address) external view returns (uint256)",
  "function MAX_ACTIVE() external view returns (uint256)",
  "function roomCount() external view returns (uint256)",
  "event RoomCreated(uint256 indexed id, address indexed creator, string item, uint256 price, uint256 collateral, bool creatorIsSeller, uint32 deliveryDeadline, uint8 dealType)",
];

const USDC_ABI = [
  "function approve(address spender, uint256 amount) external returns (bool)",
  "function transfer(address to, uint256 amount) external returns (bool)",
  "function balanceOf(address account) external view returns (uint256)",
  "function allowance(address owner, address spender) external view returns (uint256)",
];

const ARC_GAS = { maxFeePerGas: 20000000000n, maxPriorityFeePerGas: 1000000000n };

async function waitForTx(provider, txHash, timeout = 60000) {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    const r = await provider.getTransactionReceipt(txHash);
    if (r) return r;
    await new Promise(x => setTimeout(x, 300));
  }
  throw new Error('TX timeout');
}

function hashJoinCode(code) {
  return ethers.solidityPackedKeccak256(['string'], [code]);
}
function genCode() {
  const c = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let s = '';
  for (let i = 0; i < 8; i++) s += c[Math.floor(Math.random() * c.length)];
  return s;
}

async function bal(provider, addr) {
  const usdcC = new ethers.Contract(USDC, USDC_ABI, provider);
  const [u, arc] = await Promise.all([
    usdcC.balanceOf(addr),
    provider.getBalance(addr),
  ]);
  return { usdc: ethers.formatUnits(u, 6), arc: ethers.formatEther(arc) };
}

async function main() {
  const provider = new ethers.JsonRpcProvider(RPC, 5042002);

  // Generate fresh seller wallet to avoid MAX_ACTIVE
  const sellerWallet = ethers.Wallet.createRandom().connect(provider);
  const buyer1 = new ethers.Wallet(wallets.find(w => w.name === 'buyer1').privateKey, provider);

  console.log('Fresh seller:', sellerWallet.address);
  console.log('Buyer:', buyer1.address);

  // Fund seller with USDC + ARC from buyer1 (buyer1 has plenty)
  const usdcBuyer = new ethers.Contract(USDC, USDC_ABI, buyer1);
  console.log('\nFunding fresh seller wallet...');
  await (await usdcBuyer.transfer(sellerWallet.address, ethers.parseUnits('2', 6), ARC_GAS)).wait();
  // Also send some ARC for gas if needed — but Arc Testnet faucet usually free
  // We'll check balance

  const b1 = await bal(provider, sellerWallet.address);
  const b2 = await bal(provider, buyer1.address);
  console.log('\n=== Before ===');
  console.log('  Seller USDC:', b1.usdc, '| ARC:', b1.arc);
  console.log('  Buyer  USDC:', b2.usdc, '| ARC:', b2.arc);

  const contractS = new ethers.Contract(CONTRACT, ABI, sellerWallet);
  const contractB = new ethers.Contract(CONTRACT, ABI, buyer1);
  const usdcS = new ethers.Contract(USDC, USDC_ABI, sellerWallet);

  // 1. Create room
  const priceWei = ethers.parseUnits('1', 6);
  const collWei = ethers.parseUnits('0.5', 6);
  const joinCode = genCode();
  const joinCodeHash = hashJoinCode(joinCode);

  console.log('\n1. Creating room...');
  await (await usdcS.approve(CONTRACT, collWei, ARC_GAS)).wait();
  console.log('   Approved collateral');

  const txCreate = await contractS.createRoom('E2E Test Item', priceWei, collWei, joinCodeHash, true, 5, 0, ARC_GAS);
  const receiptCreate = await waitForTx(provider, txCreate.hash);
  const event = receiptCreate.logs.map(l => {
    try { return contractS.interface.parseLog(l); } catch { return null; }
  }).find(e => e?.name === 'RoomCreated');
  const roomId = Number(event.args.id);
  console.log('   Room created:', roomId);

  // 2. Buyer join
  console.log('\n2. Buyer joining...');
  const txJoin = await contractB.joinRoom(roomId, ethers.toUtf8Bytes(joinCode), ARC_GAS);
  await waitForTx(provider, txJoin.hash);
  console.log('   Joined');

  // 3. Buyer fund
  console.log('\n3. Buyer funding...');
  const usdcB = new ethers.Contract(USDC, USDC_ABI, buyer1);
  const taxBps = await contractB.FUND_TAX_BPS?.().catch(() => 100n);
  const feeWei = (priceWei * (taxBps || 100n)) / 10000n;
  const exactNeeded = priceWei + feeWei;
  await (await usdcB.approve(CONTRACT, exactNeeded, ARC_GAS)).wait();
  const txFund = await contractB.fundRoom(roomId, ARC_GAS);
  await waitForTx(provider, txFund.hash);
  console.log('   Funded');

  // 4. Seller deliver
  console.log('\n4. Seller delivering...');
  const txDeliver = await contractS.markDelivered(roomId, ethers.ZeroHash, ARC_GAS);
  await waitForTx(provider, txDeliver.hash);
  console.log('   Delivered');

  // 5. Buyer release
  console.log('\n5. Buyer releasing...');
  const txRelease = await contractB.releaseFunds(roomId, ARC_GAS);
  await waitForTx(provider, txRelease.hash);
  console.log('   Released');

  // Verify
  const af1 = await bal(provider, sellerWallet.address);
  const af2 = await bal(provider, buyer1.address);
  console.log('\n=== After ===');
  console.log('  Seller USDC:', af1.usdc, '| ARC:', af1.arc);
  console.log('  Buyer  USDC:', af2.usdc, '| ARC:', af2.arc);

  const rFinal = await contractS.rooms(roomId);
  console.log('\nRoom', roomId, 'state:', Number(rFinal.state), '(5=Released)');
  console.log('\n✅ E2E flow complete!');
}

main().catch(e => { console.error(e); process.exit(1); });
