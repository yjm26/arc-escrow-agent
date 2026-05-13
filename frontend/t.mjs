
const { ethers } = require('./node_modules/ethers');
const w = ethers.Wallet.createRandom();
console.log('addr:', w.address);
console.log('pk:', w.privateKey);
