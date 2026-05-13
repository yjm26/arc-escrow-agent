const hre = require("hardhat");

async function main() {
  const treasury = "0xB8b4e8E7Ad2651d36b8E0D24B5EF1ae06EE2cC4a";
  const arbiter = "0xB8b4e8E7Ad2651d36b8E0D24B5EF1ae06EE2cC4a"; // same for now, can change later
  const arbiterName = "eunoia";

  const BondRoomV12 = await hre.ethers.getContractFactory("BondRoomV12");
  const contract = await BondRoomV12.deploy(treasury, arbiter, arbiterName);
  await contract.waitForDeployment();

  const address = await contract.getAddress();
  console.log("BondRoomV12 deployed to:", address);

  // Test: create room with 0 collateral
  const tx = await contract.createRoom(
    "Test item",
    hre.ethers.parseEther("0.01"),
    0,
    hre.ethers.keccak256(hre.ethers.toUtf8Bytes("test123")),
    true,
    { value: 0 }
  );
  await tx.wait();
  console.log("Test room (0 collateral): OK");

  // Test: create room WITH collateral
  const tx2 = await contract.createRoom(
    "NFT Whitelist spot",
    hre.ethers.parseEther("0.5"),
    hre.ethers.parseEther("0.25"), // 0.25 collateral
    hre.ethers.keccak256(hre.ethers.toUtf8Bytes("abc")),
    true,
    { value: hre.ethers.parseEther("0.25") }
  );
  await tx2.wait();
  console.log("Test room (0.25 collateral): OK");

  const room = await contract.getRoom(1);
  console.log("Room 1 collateral locked:", room[6].toString());
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
