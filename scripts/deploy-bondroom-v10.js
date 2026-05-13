const hre = require("hardhat");

async function main() {
  const treasury = "0xB8b4e8E7Ad2651d36b8E0D24B5EF1ae06EE2cC4a";
  const arbiterName = "Bond Escrow";

  console.log("Deploying BondRoomV10...");
  const BondRoom = await hre.ethers.getContractFactory("BondRoomV10");
  const bondRoom = await BondRoom.deploy(treasury, arbiterName);
  await bondRoom.waitForDeployment();

  const address = await bondRoom.getAddress();
  console.log("\n================================================");
  console.log("BondRoomV10 deployed to:", address);
  console.log("================================================");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
