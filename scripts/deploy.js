const hre = require("hardhat");

async function main() {
  const USDC_ADDRESS = process.env.USDC_ADDRESS || "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238";

  console.log("Deploying Escrow contract...");
  console.log("USDC address:", USDC_ADDRESS);

  const Escrow = await hre.ethers.getContractFactory("Escrow");
  const escrow = await Escrow.deploy(USDC_ADDRESS);

  await escrow.waitForDeployment();
  const address = await escrow.getAddress();

  console.log("Escrow deployed to:", address);
  console.log("Network:", hre.network.name);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
