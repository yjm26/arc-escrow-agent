
const hre = require("hardhat");

async function main() {
  const CONTRACT = "0x59Ab8013D4e65d938Ab83b235956e1881046BfB4";
  const USDC = "0x3600000000000000000000000000000000000000";
  
  const [signer] = await hre.ethers.getSigners();
  console.log("Signer:", signer.address);
  
  // Simple ABI for USDC
  const usdcAbi = ["function approve(address,uint256) returns (bool)", "function balanceOf(address) view returns (uint256)"];
  const usdc = new hre.ethers.Contract(USDC, usdcAbi, signer);
  const bal = await usdc.balanceOf(signer.address);
  console.log("USDC balance:", hre.ethers.formatUnits(bal, 6));
  
  // Test: Simple approve
  console.log("\n--- Test: Approve 1 USDC ---");
  const tx = await usdc.approve(CONTRACT, hre.ethers.parseUnits("1", 6), { gasLimit: 100000 });
  console.log("TX hash:", tx.hash);
  console.log("TX nonce:", tx.nonce);
  console.log("TX maxFeePerGas:", tx.maxFeePerGas?.toString());
  
  // Try tx.wait() with 15s timeout
  try {
    const receipt = await Promise.race([
      tx.wait(),
      new Promise((_, reject) => setTimeout(() => reject(new Error("tx.wait timeout")), 15000))
    ]);
    console.log("✅ tx.wait() worked! status:", receipt.status, "block:", receipt.blockNumber);
  } catch(e) {
    console.log("❌ tx.wait() failed:", e.message);
    // Manual poll with ethers provider
    console.log("Polling getTransactionReceipt...");
    for (let i = 0; i < 5; i++) {
      const r = await hre.ethers.provider.getTransactionReceipt(tx.hash);
      if (r) { console.log("✅ Found via polling! status:", r.status, "block:", r.blockNumber); break; }
      console.log("  Poll " + (i+1) + "/5: null");
      await new Promise(r => setTimeout(r, 2000));
    }
    
    // Also try raw JSON-RPC
    console.log("\nTrying raw JSON-RPC...");
    const raw = await hre.ethers.provider.send("eth_getTransactionReceipt", [tx.hash]);
    console.log("Raw result:", raw ? "got receipt" : "null");
  }
}

main().catch(console.error);
