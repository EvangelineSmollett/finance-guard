import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";

const deployFinanceGuard: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts } = hre;
  const { deploy } = deployments;
  const { deployer } = await getNamedAccounts();

  await deploy("FinanceGuard", {
    from: deployer,
    args: [],
    log: true,
    waitConfirmations: 1,
  });
};

export default deployFinanceGuard;
deployFinanceGuard.tags = ["FinanceGuard"];

