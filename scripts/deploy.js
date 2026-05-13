const hre = require("hardhat");

async function main() {
  const USDC_ADDRESS = process.env.USDC_ADDRESS || "0x3600000000000000000000000000000000000000";
  const TREASURY = process.env.TREASURY || "0xB8b4e8E7Ad2651d36b8E0D24B5EF1ae06EE2cC4a";
  const ARBITER = process.env.ARBITER || "0xB8b4e8E7Ad2651d36b8E0D24B5EF1ae06EE2cC4a";
  const ARBITER_NAME = process.env.ARBITER_NAME || "BOND Team";

  console.log("Deploying BondRoomV13...");
  console.log("USDC:", USDC_ADDRESS);
  console.log("Treasury:", TREASURY);
  console.log("Arbiter:", ARBITER);

  const BondRoom = await hre.ethers.getContractFactory("BondRoom");
  const room = await BondRoom.deploy(USDC_ADDRESS, TREASURY, ARBITER, ARBITER_NAME);

  await room.waitForDeployment();
  const address = await room.getAddress();

  console.log("BondRoom deployed to:", address);
  console.log("Network:", hre.network.name);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
