import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";

const deployFinanceGuard: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts, network } = hre;
  const { deploy } = deployments;
  const { deployer } = await getNamedAccounts();

  if (network.name === "sepolia" && !process.env.SEPOLIA_RPC_URL) {
    throw new Error("SEPOLIA_RPC_URL environment variable is required for Sepolia deployment");
  }

  if (network.name === "sepolia" && !process.env.PRIVATE_KEY) {
    throw new Error("PRIVATE_KEY environment variable is required for Sepolia deployment");
  }

  const waitConfirmations = network.name === "sepolia" ? 2 : 1;

  const result = await deploy("FinanceGuard", {
    from: deployer,
    args: [],
    log: true,
    waitConfirmations: waitConfirmations,
  });

  if (!result.address || result.address === "0x0000000000000000000000000000000000000000") {
    throw new Error("Contract deployment failed: invalid address");
  }

  if (!result.newlyDeployed && hre.network.name !== "localhost") {
    console.warn("Contract already deployed at:", result.address);
  }

  console.log(`FinanceGuard deployed to ${network.name} at:`, result.address);
};

export default deployFinanceGuard;
deployFinanceGuard.tags = ["FinanceGuard"];

