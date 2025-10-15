import { ethers } from "hardhat";

async function main() {
  const hub = process.env.SELF_HUB_ADDRESS || ethers.ZeroAddress; // TODO: set actual Hub V2 address
  const multisendScopeSeed = "multisend-v1";
  const claimdropScopeSeed = "claimdrop-v1";

  // Placeholder human-only config id for initial compilation/testing.
  const humanOnlyConfigId = ethers.keccak256(
    ethers.toUtf8Bytes("human-only-config")
  );

  const MultiSend = await ethers.getContractFactory("MultiSendSelfGuarded");
  const multisend = await MultiSend.deploy(
    hub,
    multisendScopeSeed,
    humanOnlyConfigId
  );
  await multisend.waitForDeployment();
  console.log("MultiSendSelfGuarded deployed:", await multisend.getAddress());

  const ClaimDrop = await ethers.getContractFactory("ClaimDropSelf");
  const claimdrop = await ClaimDrop.deploy(hub, claimdropScopeSeed);
  await claimdrop.waitForDeployment();
  console.log("ClaimDropSelf deployed:", await claimdrop.getAddress());
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
