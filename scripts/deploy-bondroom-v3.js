const hre = require("hardhat");

async function main() {
  // USDC ERC-20 precompile on Arc
  const USDC = process.env.USDC_ADDRESS || "0x3600000000000000000000000000000000000000";

  // Deployer = wallet lo (bayar gas, create room)
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deployer:", deployer.address);

  // Treasury = wallet khusus terima fee
  let treasury;
  if (process.env.TREASURY_PRIVATE_KEY) {
    const wallet = new hre.ethers.Wallet(process.env.TREASURY_PRIVATE_KEY);
    treasury = wallet.address;
  } else {
    treasury = deployer.address;
    console.log("⚠️  No TREASURY_PRIVATE_KEY — using deployer as treasury");
  }

  console.log("Treasury:", treasury);
  console.log("USDC:", USDC);
  console.log("Network:", hre.network.name);
  console.log("");

  const BondRoom = await hre.ethers.getContractFactory("BondRoomV3");
  const room = await BondRoom.deploy(USDC, treasury);
  await room.waitForDeployment();

  const address = await room.getAddress();
  console.log("✅ BondRoomV3 deployed:", address);
  console.log("");
  console.log("Update frontend/src/lib/contract.js:");
  console.log("  BONDROOM_ADDRESS = '" + address + "'");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
