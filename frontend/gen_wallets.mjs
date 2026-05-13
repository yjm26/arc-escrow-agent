
import { ethers } from 'ethers';

for (let i = 0; i < 2; i++) {
  const w = ethers.Wallet.createRandom();
  console.log(`Wallet ${i+1}:`);
  console.log('  Address:', w.address);
  console.log('  PK:', w.privateKey);
}
