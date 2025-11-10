import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { ethers, fhevm } from "hardhat";
import { FinanceGuard, FinanceGuard__factory } from "../types";
import { expect } from "chai";
import { FhevmType } from "@fhevm/hardhat-plugin";

type Signers = {
  deployer: HardhatEthersSigner;
  alice: HardhatEthersSigner;
};

async function deployFixture() {
  const factory = (await ethers.getContractFactory("FinanceGuard")) as FinanceGuard__factory;
  const financeGuardContract = (await factory.deploy()) as FinanceGuard;
  const financeGuardContractAddress = await financeGuardContract.getAddress();

  return { financeGuardContract, financeGuardContractAddress };
}

describe("FinanceGuard Sepolia", function () {
  let signers: Signers;
  let financeGuardContract: FinanceGuard;
  let financeGuardContractAddress: string;

  before(async function () {
    // Check if we're on Sepolia network
    const network = await ethers.provider.getNetwork();
    if (network.chainId !== 11155111n) {
      console.warn("This test suite is designed for Sepolia testnet");
      this.skip();
    }

    const ethSigners: HardhatEthersSigner[] = await ethers.getSigners();
    signers = { deployer: ethSigners[0], alice: ethSigners[1] };
  });

  beforeEach(async function () {
    // Check whether the tests are running against an FHEVM mock environment
    if (fhevm.isMock) {
      console.warn(`This test suite is for Sepolia testnet, skipping mock tests`);
      this.skip();
    }

    ({ financeGuardContract, financeGuardContractAddress } = await deployFixture());
  });

  it("should deploy successfully on Sepolia", async function () {
    const address = await financeGuardContract.getAddress();
    expect(address).to.be.properAddress;
  });

  it("should have zero transactions after deployment", async function () {
    const count = await financeGuardContract.getUserTransactionCount(signers.alice.address);
    expect(count).to.eq(0);
  });

  it("should add a transaction on Sepolia", async function () {
    const amountInCents = 100000; // $1000.00
    const encryptedAmount = await fhevm
      .createEncryptedInput(financeGuardContractAddress, signers.alice.address)
      .add32(amountInCents)
      .encrypt();

    const tx = await financeGuardContract
      .connect(signers.alice)
      .addTransaction(
        0, // TransactionType.Income
        "Test Income",
        encryptedAmount.handles[0],
        encryptedAmount.inputProof,
        "Test",
        true // encryptOnChain
      );
    await tx.wait();

    const count = await financeGuardContract.getUserTransactionCount(signers.alice.address);
    expect(count).to.eq(1);
  });
});


