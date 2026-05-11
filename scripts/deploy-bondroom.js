const hre = require("hardhat");

async function main() {
  // Arc Testnet USDC — ganti dengan address USDC testnet lo
  const USDC = "0xYourTestnetUSDCAddress";
  // Treasury = wallet lo sendiri
  const TREASURY = "0xF87114db9138eC11930f30D8402b23B7E7F17AF3";

  const BondRoom = await hre.ethers.getContractFactory("BondRoom");
  const room = await BondRoom.deploy(USDC, TREASURY);
  await room.waitForDeployment();

  console.log("BondRoom deployed to:", await room.getAddress());
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
