import * as dotenv from "dotenv";
dotenv.config();

import { ethers } from "hardhat";
import { MultiSendETH, SelfProtectedDrop } from "../typechain-types";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deployer:", deployer.address);

  // Deployed contract addresses provided by user
  const SELF_PROTECTED_DROP = "0x4275854fDEF5EE848a2F9F9e10f17119E285A498";
  const MULTISEND_ETH = "0x8F94D7a05A4288c4D3C211eA285c7d0649A295Bd";

  // Controls
  // RUN_ONLY: "self" | "regular" | "both"
  const RUN_ONLY = (process.env.RUN_ONLY || "both").toLowerCase();
  // UNIQUE_ADDR: set to "1" to use 200 generated unique addresses instead of repeating the 14
  const USE_UNIQUE_ADDRESSES = true;

  const baseRecipients: string[] = [
    "0x0914543c9716D8A4811187a78606A50cA81B9C14",
    "0xB5566B563A711d891cB7678a7c62acA6509720e0",
    "0x9b6D723bCE940D97cD56953678001A2b5bd14D39",
    "0x6942f1418bEF7Eea0B9D2dDd78f0334fBeDfE167",
    "0x7Dd39fc27537D14bE67250b79E594e71b8C2f4d2",
    "0xDDe9d0aCD2082546EDE8A3fc81e0D367b1789555",
    "0x363C6Fc7Ea65f8232bbCcB1bA90bB0e4727422dc",
    "0x3C16C7092FE83d874BC4dd52c3b51510C69F1D7b",
    "0xE876d017F57aC0136555b06B75151f0eFEbb252f",
    "0xccdB5043087a5D4a8598A73fe1d789a130C5Cb4C",
    "0x11e92E85dcEE8af4959c3415769c2F44695B9795",
    "0x722b476bC0C26eEA5CD62160e7519bd7e2EA92C9",
    "0xb1387cE926d1A2B4C8d90373e462DFeB8873a88D",
    "0xE9c04f3e0c86ec5D256D43f79adb54df124c8625",
  ];

  // Build 200 entries
  const targetCount = 200;
  const recipients: string[] = [];
  const amounts: bigint[] = [];

  if (USE_UNIQUE_ADDRESSES) {
    // Generate 200 unique addresses (no funding required to receive)
    for (let i = 0; i < targetCount; i++) {
      const wallet = ethers.Wallet.createRandom();
      recipients.push(wallet.address);
    }
  } else {
    // Repeat the provided 14 addresses until reaching 200
    let i = 0;
    while (recipients.length < targetCount) {
      const idx = i % baseRecipients.length;
      recipients.push(baseRecipients[idx]);
      i++;
    }
  }

  // Unique tiny amounts: base + i * step (in wei) to make each amount distinct
  const baseWei = ethers.parseEther("0.0000001"); // 1e-7 CELO
  const stepWei = ethers.parseEther("0.000000001"); // 1e-9 CELO
  for (let i = 0; i < targetCount; i++) {
    amounts.push(baseWei + stepWei * BigInt(i));
  }

  console.log("Planned recipient count:", recipients.length);
  const total = amounts.reduce((acc, v) => acc + v, 0n);
  console.log("Total CELO to send (wei):", total.toString());

  // Attach to deployed contracts
  const Drop = await ethers.getContractFactory("SelfProtectedDrop");
  const drop = Drop.attach(SELF_PROTECTED_DROP) as SelfProtectedDrop;
  const Regular = await ethers.getContractFactory("MultiSendETH");
  const regular = Regular.attach(MULTISEND_ETH) as MultiSendETH;

  if (RUN_ONLY === "regular" || RUN_ONLY === "both") {
    console.log("Executing MultiSendETH.multisendETH...");
    const tx2 = await regular.multisendETH(recipients, amounts, {
      value: total,
    });
    const rc2 = await tx2.wait();
    console.log("MultiSendETH tx:", tx2.hash);
    console.log("Gas used:", rc2?.gasUsed?.toString());
  }

  if (RUN_ONLY === "self" || RUN_ONLY === "both") {
    console.log("Executing SelfProtectedDrop.airdropETH...");
    const tx1 = await drop.airdropETH(recipients, amounts, { value: total });
    const rc1 = await tx1.wait();
    console.log("SelfProtectedDrop tx:", tx1.hash);
    console.log("Gas used:", rc1?.gasUsed?.toString());
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
