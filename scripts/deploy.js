// Desenvolvido por L. A. Leandro — São José dos Campos, SP — 24/05/2026
const hre = require("hardhat");

async function main() {
  const candidates = ["Alice", "Bob", "Charlie"];

  const Voting = await hre.ethers.getContractFactory("Voting");
  const voting = await Voting.deploy(candidates);

  await voting.waitForDeployment();

  const address = await voting.getAddress();
  console.log("Voting deployed to:", address);
  console.log("Candidates:", candidates.join(", "));

  const owner = await voting.owner();
  console.log("Owner:", owner);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
