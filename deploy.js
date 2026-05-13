#!/usr/bin/env node
// Quick deploy script - just run: node deploy.js
// Make sure .env is configured first!

const hre = require("hardhat");

async function main() {
  const treasury = "0xB8b4e8E7Ad2651d36b8E0D24B5EF1ae06EE2cC4a";
  const arbiterName = "Bond Escrow";

  console.log("Deploying BondRoomV7...");
  const BondRoom = await hre.ethers.getContractFactory("BondRoomV7");
  const bondRoom = await BondRoom.deploy(treasury, arbiterName);
  await bondRoom.waitForDeployment();

  const address = await bondRoom.getAddress();
  console.log("\n================================================");
  console.log("BondRoomV7 deployed to:", address);
  console.log("================================================");
  console.log("\nNow update frontend/src/utils/contract.js:");
  console.log("  export const CONTRACT_ADDRESS = '" + address + "';");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
