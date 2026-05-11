const hre = require("hardhat");

async function main() {
  const USDC = process.env.USDC_ADDRESS || "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238";

  // Deployer = wallet lo (bayar gas, create room)
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deployer:", deployer.address);

  // Treasury = wallet khusus terima fee
  let treasury;
  if (process.env.TREASURY_PRIVATE_KEY) {
    // Derive address from private key
    const wallet = new hre.ethers.Wallet(process.env.TREASURY_PRIVATE_KEY);
    treasury = wallet.address;
  } else {
    // Default: same as deployer (not recommended)
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
