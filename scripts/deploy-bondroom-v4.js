const hre = require("hardhat");

async function main() {
  const USDC = process.env.USDC_ADDRESS || "0x3600000000000000000000000000000000000000";
  const [deployer] = await hre.ethers.getSigners();

  let treasury;
  if (process.env.TREASURY_PRIVATE_KEY) {
    const wallet = new hre.ethers.Wallet(process.env.TREASURY_PRIVATE_KEY);
    treasury = wallet.address;
  } else {
    treasury = deployer.address;
  }

  console.log("Deployer:", deployer.address);
  console.log("Treasury:", treasury);
  console.log("USDC:", USDC);

  const BondRoom = await hre.ethers.getContractFactory("BondRoomV4");
  const room = await BondRoom.deploy(USDC, treasury);
  await room.waitForDeployment();

  console.log("✅ BondRoomV4 deployed:", await room.getAddress());
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
