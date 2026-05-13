const { ethers } = require('hardhat');

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log('Deploying with:', deployer.address);

  const USDC = process.env.USDC_ADDRESS || '0x3600000000000000000000000000000000000000';
  const TREASURY = process.env.TREASURY_ADDRESS || deployer.address;
  const ARBITER = process.env.ARBITER_ADDRESS || deployer.address;
  const ARBITER_NAME = process.env.ARBITER_NAME || 'BondRoom Arbiter';

  const BondRoom = await ethers.getContractFactory('BondRoomV18');
  const contract = await BondRoom.deploy(USDC, TREASURY, ARBITER, ARBITER_NAME);
  await contract.waitForDeployment();

  const addr = await contract.getAddress();
  console.log('BondRoomV18 deployed to:', addr);
  console.log('USDC:', USDC);
  console.log('Treasury:', TREASURY);
  console.log('Arbiter:', ARBITER);

  // Write address to file for CI / frontend update
  const fs = require('fs');
  fs.writeFileSync('deployed-address.txt', addr);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
