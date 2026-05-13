const hre = require("hardhat");

async function main() {
  const treasury = "0xB8b4e8E7Ad2651d36b8E0D24B5EF1ae06EE2cC4a";
  const arbiter = "0xB8b4e8E7Ad2651d36b8E0D24B5EF1ae06EE2cC4a";
  const arbiterName = "eunoia";

  console.log("Deploying BondRoomV15 (standard ERC-20 approve+transferFrom)...");
  const BondRoomV15 = await hre.ethers.getContractFactory("BondRoomV15");
  const contract = await BondRoomV15.deploy(
    "0x3600000000000000000000000000000000000000", // USDC
    treasury,
    arbiter,
    arbiterName
  );
  await contract.waitForDeployment();

  const address = await contract.getAddress();
  console.log("\n================================================");
  console.log("BondRoomV15 deployed to:", address);
  console.log("================================================");
  console.log("\nUpdate frontend/src/utils/contract.js:");
  console.log("  CONTRACT_ADDRESS = '" + address + "'");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
