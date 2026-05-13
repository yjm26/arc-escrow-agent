
import { ethers } from 'ethers';

async function main() {
  const provider = new ethers.JsonRpcProvider('https://rpc.testnet.arc.network');
  
  const CONTRACT_ABI = [
    'function createRoom(string _item, uint256 _price, uint256 _collateral, bytes32 _joinCodeHash, bool _creatorIsSeller) external',
  ];
  
  const contract = new ethers.Contract('0x59Ab8013D4e65d938Ab83b235956e1881046BfB4', CONTRACT_ABI, provider);
  
  const price = ethers.parseUnits('1', 6);
  const collateral = 0n;
  const joinCodeHash = ethers.keccak256(ethers.toUtf8Bytes('TESTCODE'));
  const creatorIsSeller = false;
  
  // Fix checksum
  const fromAddr = ethers.getAddress('0x23451D327828a85627Ee623733394047734Cea5a');
  
  try {
    const gas = await contract.createRoom.estimateGas('Test item', price, collateral, joinCodeHash, creatorIsSeller, {
      from: fromAddr,
      maxFeePerGas: 20000000000n,
      maxPriorityFeePerGas: 1000000000n,
    });
    console.log('estimateGas SUCCESS:', gas.toString());
  } catch (e) {
    console.log('estimateGas FAILED:', e.message);
    if (e.info) console.log('Error info:', JSON.stringify(e.info));
  }
  
  try {
    await contract.createRoom.staticCall('Test item', price, collateral, joinCodeHash, creatorIsSeller, { from: fromAddr });
    console.log('staticCall SUCCESS');
  } catch (e) {
    console.log('staticCall FAILED:', e.message);
  }
}
main().catch(console.error);
