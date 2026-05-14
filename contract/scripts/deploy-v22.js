const hre = require('hardhat');

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log('Deploying with:', deployer.address);

  const BondRoom = await hre.ethers.getContractFactory('BondRoomV22');
  const contract = await BondRoom.deploy(
    '0x3600000000000000000000000000000000000000', // USDC
    '0xdb4f178870Ec23c6D81F192fb81A833a4aE28eF4', // treasury
    '0xdb4f178870Ec23c6D81F192fb81A833a4aE28eF4', // arbiter
    'BOND Arbiter'
  );

  await contract.waitForDeployment();
  console.log('BondRoomV22 deployed to:', await contract.getAddress());
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
