import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";

const deployFinanceGuard: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts } = hre;
  const { deploy } = deployments;
  const { deployer } = await getNamedAccounts();

  const result = await deploy("FinanceGuard", {
    from: deployer,
    args: [],
    log: true,
    waitConfirmations: 1,
  });

  if (!result.address || result.address === "0x0000000000000000000000000000000000000000") {
    throw new Error("Contract deployment failed: invalid address");
  }

  if (!result.newlyDeployed && hre.network.name !== "localhost") {
    console.warn("Contract already deployed at:", result.address);
  }
};

export default deployFinanceGuard;
deployFinanceGuard.tags = ["FinanceGuard"];

