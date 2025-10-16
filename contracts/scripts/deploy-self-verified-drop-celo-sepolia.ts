import * as dotenv from "dotenv";
dotenv.config();

import { ethers, network } from "hardhat";

async function main() {
  if (network.name !== "celo_sepolia") {
    console.warn(
      `Warning: intended for celo_sepolia, current: ${network.name}`
    );
  }

  const HUB_V2 = "0x16ECBA51e18a4a7e61fdC417f0d47AFEeDfbed74"; // Celo Sepolia Hub V2
  const SCOPE_SEED = process.env.SELF_SCOPE_SEED || "self-backed-sender";
  const CONFIG_ID =
    process.env.SELF_CONFIG_ID ||
    "0x32332b93ed35ffa75a313b4b2f3e096490739747c872307590d30cf7e936483a";

  const [deployer] = await ethers.getSigners();
  console.log("Deployer:", deployer.address);

  // 1) Deploy the contract with hub + scope seed
  const Factory = await ethers.getContractFactory("SelfVerifiedDrop");
  const contract = await Factory.deploy(HUB_V2, SCOPE_SEED);
  await contract.waitForDeployment();
  const addr = await contract.getAddress();
  console.log("SelfVerifiedDrop deployed:", addr);

  // 2) Set config id
  const setCfg = await contract.setConfigId(CONFIG_ID as `0x${string}`);
  await setCfg.wait();
  console.log("ConfigId set:", CONFIG_ID);

  const scope = await contract.getScope();
  console.log("Contract scope:", scope.toString());

  /*
   Web flow (high level):
   - Frontend generates a Self verification request using the SAME configId and the contract's scope:
       - Ensure the builder uses: scope = on-chain getScope() and configId = CONFIG_ID above
       - User completes verification in Self app
   - Frontend obtains proof payload from Self SDK and calls:
       contract.verifySelfProof(proofPayload, userData)
       -> Hub validates proof and calls back customVerificationHook
       -> Contract stores a 30-day expiry for the user's identifier/address
   - After verifySelfProof succeeds, the sender can execute transfers for 30 days:
       contract.airdropETH(addresses, amounts, { value: total + optionalDust })
       or
       contract.airdropERC20(token, addresses, amounts, total) with prior token approval
   - If 30 days elapse, the user must repeat verification (new proof) before sending again.
  */
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
