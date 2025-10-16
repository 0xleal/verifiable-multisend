import * as dotenv from "dotenv";
dotenv.config();

import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deployer:", deployer.address);

  // Inputs
  const tokenName = "Demo Token";
  const tokenSymbol = "DEMO";
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

  // Define custom amounts per recipient (example values). Adjust as needed.
  // Note: amounts are in token's smallest unit (18 decimals assumed)
  const amounts = [
    "100",
    "200",
    "300",
    "400",
    "500",
    "600",
    "700",
    "800",
    "900",
    "1000",
    "1100",
    "1200",
    "1300",
    "1400",
  ].map((v) => ethers.parseUnits(v, 18));

  if (recipients.length !== amounts.length) {
    throw new Error("recipients and amounts length mismatch");
  }

  // 1) Deploy TestERC20
  const TestERC20 = await ethers.getContractFactory("TestERC20");
  const token = await TestERC20.deploy(tokenName, tokenSymbol);
  await token.waitForDeployment();
  console.log("TestERC20 deployed at:", await token.getAddress());

  // 2) Mint total required to deployer
  const total = amounts.reduce((acc, v) => acc + v, 0n);
  const mintTx = await token.mint(deployer.address, total);
  await mintTx.wait();
  console.log("Minted total:", total.toString());

  // 3) Deploy SelfProtectedDrop
  const SelfProtectedDrop = await ethers.getContractFactory(
    "SelfProtectedDrop"
  );
  const drop = await SelfProtectedDrop.deploy();
  await drop.waitForDeployment();
  const dropAddress = await drop.getAddress();
  console.log("SelfProtectedDrop deployed at:", dropAddress);

  // 4) Approve drop contract to pull tokens
  const approveTx = await token.approve(dropAddress, total);
  await approveTx.wait();
  console.log("Approved:", total.toString());

  // 5) Execute airdropERC20
  const airdropTx = await drop.airdropERC20(
    await token.getAddress(),
    recipients,
    amounts,
    total
  );
  await airdropTx.wait();
  console.log("Airdrop complete. Tx:", airdropTx.hash);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
