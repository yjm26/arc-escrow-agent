
import { ethers } from 'ethers';

async function main() {
  const wallet = ethers.Wallet.createRandom();
  console.log('Address:', wallet.address);
  console.log('PK:', wallet.privateKey);
  
  const provider = new ethers.JsonRpcProvider('https://rpc.testnet.arc.network');
  
  const native = await provider.getBalance(wallet.address);
  console.log('Native USDC:', ethers.formatUnits(native, 18));
  
  const usdc = new ethers.Contract('0x3600000000000000000000000000000000000000', 
    ['function balanceOf(address) view returns (uint256)'], provider);
  const erc20 = await usdc.balanceOf(wallet.address);
  console.log('ERC-20 USDC:', ethers.formatUnits(erc20, 6));
  
  const gas = await provider.send('eth_gasPrice', []);
  console.log('Gas price:', ethers.formatUnits(gas, 'gwei'), 'Gwei');
}
main().catch(console.error);
