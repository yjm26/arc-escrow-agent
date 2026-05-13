const hre = require("hardhat");

async function main() {
  const treasury = "0xB8b4e8E7Ad2651d36b8E0D24B5EF1ae06EE2cC4a";
  const arbiterName = "eunoia";

  const BondRoomV8 = await hre.ethers.getContractFactory("BondRoomV8");
  const contract = await BondRoomV8.deploy(treasury, arbiterName);
  await contract.waitForDeployment();

  const address = await contract.getAddress();
  console.log("BondRoomV8 deployed to:", address);

  // Test createRoom with 0 collateral
  const tx = await contract.createRoom(
    "Test item",
    hre.ethers.parseEther("0.01"),
    0, // no collateral
    hre.ethers.keccak256(hre.ethers.toUtf8Bytes("test123")),
    { value: 0 }
  );
  await tx.wait();
  console.log("Test room created (0 collateral): OK");

  const room = await contract.getRoom(0);
  console.log("Room 0 collateral:", room[4].toString());
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
