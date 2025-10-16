import * as dotenv from "dotenv";
dotenv.config();

import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deployer:", deployer.address);

  const recipients: string[] = [
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

  // Very small varying amounts of native CELO (in wei). ~10^-8 to 10^-6 CELO range
  const amounts = [
    ethers.parseEther("0.0000001"),
    ethers.parseEther("0.0000002"),
    ethers.parseEther("0.0000003"),
    ethers.parseEther("0.0000004"),
    ethers.parseEther("0.0000005"),
    ethers.parseEther("0.0000006"),
    ethers.parseEther("0.0000007"),
    ethers.parseEther("0.0000008"),
    ethers.parseEther("0.0000009"),
    ethers.parseEther("0.0000010"),
    ethers.parseEther("0.0000011"),
    ethers.parseEther("0.0000012"),
    ethers.parseEther("0.0000013"),
    ethers.parseEther("0.0000014"),
  ];

  if (recipients.length !== amounts.length) {
    throw new Error("recipients and amounts length mismatch");
  }

  const total = amounts.reduce((acc, v) => acc + v, 0n);
  console.log("Total CELO to send (wei):", total.toString());

  const SelfProtectedDrop = await ethers.getContractFactory(
    "SelfProtectedDrop"
  );
  const drop = await SelfProtectedDrop.deploy();
  await drop.waitForDeployment();
  const dropAddress = await drop.getAddress();
  console.log("SelfProtectedDrop deployed at:", dropAddress);

  const airdropTx = await drop.airdropETH(recipients, amounts, {
    value: total,
  });
  const receipt = await airdropTx.wait();
  console.log("Native CELO airdrop complete. Tx:", airdropTx.hash);
  console.log("Gas used:", receipt?.gasUsed?.toString());
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
