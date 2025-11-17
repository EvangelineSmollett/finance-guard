import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { ethers, fhevm } from "hardhat";
import { FinanceGuard, FinanceGuard__factory } from "../types";
import { expect } from "chai";
import { FhevmType } from "@fhevm/hardhat-plugin";

type Signers = {
  deployer: HardhatEthersSigner;
  alice: HardhatEthersSigner;
  bob: HardhatEthersSigner;
};

async function deployFixture() {
  const factory = (await ethers.getContractFactory("FinanceGuard")) as FinanceGuard__factory;
  const financeGuardContract = (await factory.deploy()) as FinanceGuard;
  const financeGuardContractAddress = await financeGuardContract.getAddress();

  return { financeGuardContract, financeGuardContractAddress };
}

describe("FinanceGuard", function () {
  let signers: Signers;
  let financeGuardContract: FinanceGuard;
  let financeGuardContractAddress: string;

  before(async function () {
    const ethSigners: HardhatEthersSigner[] = await ethers.getSigners();
    signers = { deployer: ethSigners[0], alice: ethSigners[1], bob: ethSigners[2] };
  });

  beforeEach(async function () {
    // Check whether the tests are running against an FHEVM mock environment
    if (!fhevm.isMock) {
      console.warn(`This hardhat test suite cannot run on Sepolia Testnet`);
      this.skip();
    }

    ({ financeGuardContract, financeGuardContractAddress } = await deployFixture());
  });

  it("should have zero transactions after deployment", async function () {
    const count = await financeGuardContract.getUserTransactionCount(signers.alice.address);
    expect(count).to.eq(0);
  });

  it("should add an income transaction", async function () {
    const amountInCents = 250000; // $2500.00
    const encryptedAmount = await fhevm
      .createEncryptedInput(financeGuardContractAddress, signers.alice.address)
      .add32(amountInCents)
      .encrypt();

    const tx = await financeGuardContract
      .connect(signers.alice)
      .addTransaction(
        0, // TransactionType.Income
        "Salary",
        encryptedAmount.handles[0],
        encryptedAmount.inputProof,
        "Salary",
        true // encryptOnChain
      );
    await tx.wait();

    const count = await financeGuardContract.getUserTransactionCount(signers.alice.address);
    expect(count).to.eq(1);

    const transaction = await financeGuardContract.getTransaction(signers.alice.address, 0);
    expect(transaction.transactionType).to.eq(0); // Income
    expect(transaction.description).to.eq("Salary");
    expect(transaction.isEncrypted).to.eq(true);

    // Decrypt and verify amount
    const decryptedAmount = await fhevm.userDecryptEuint(
      FhevmType.euint32,
      transaction.encryptedAmount,
      financeGuardContractAddress,
      signers.alice,
    );
    expect(decryptedAmount).to.eq(amountInCents);
  });

  it("should add an expense transaction", async function () {
    const amountInCents = 5000; // $50.00
    const encryptedAmount = await fhevm
      .createEncryptedInput(financeGuardContractAddress, signers.alice.address)
      .add32(amountInCents)
      .encrypt();

    const tx = await financeGuardContract
      .connect(signers.alice)
      .addTransaction(
        1, // TransactionType.Expense
        "Groceries",
        encryptedAmount.handles[0],
        encryptedAmount.inputProof,
        "Food",
        true // encryptOnChain
      );
    await tx.wait();

    const count = await financeGuardContract.getUserTransactionCount(signers.alice.address);
    expect(count).to.eq(1);

    const transaction = await financeGuardContract.getTransaction(signers.alice.address, 0);
    expect(transaction.transactionType).to.eq(1); // Expense
    expect(transaction.description).to.eq("Groceries");

    // Decrypt and verify amount
    const decryptedAmount = await fhevm.userDecryptEuint(
      FhevmType.euint32,
      transaction.encryptedAmount,
      financeGuardContractAddress,
      signers.alice,
    );
    expect(decryptedAmount).to.eq(amountInCents);
  });

  it("should calculate monthly totals correctly", async function () {
    const incomeAmount1 = 100000; // $1000.00
    const incomeAmount2 = 50000; // $500.00
    const expenseAmount = 30000; // $300.00

    // Add first income
    const encryptedIncome1 = await fhevm
      .createEncryptedInput(financeGuardContractAddress, signers.alice.address)
      .add32(incomeAmount1)
      .encrypt();

    await financeGuardContract
      .connect(signers.alice)
      .addTransaction(0, "Income 1", encryptedIncome1.handles[0], encryptedIncome1.inputProof, "Salary", true);

    // Add second income
    const encryptedIncome2 = await fhevm
      .createEncryptedInput(financeGuardContractAddress, signers.alice.address)
      .add32(incomeAmount2)
      .encrypt();

    await financeGuardContract
      .connect(signers.alice)
      .addTransaction(0, "Income 2", encryptedIncome2.handles[0], encryptedIncome2.inputProof, "Freelance", true);

    // Add expense
    const encryptedExpense = await fhevm
      .createEncryptedInput(financeGuardContractAddress, signers.alice.address)
      .add32(expenseAmount)
      .encrypt();

    await financeGuardContract
      .connect(signers.alice)
      .addTransaction(1, "Expense 1", encryptedExpense.handles[0], encryptedExpense.inputProof, "Food", true);

    // Get current year-month
    const currentTimestamp = await ethers.provider.getBlock("latest");
    const yearMonth = await financeGuardContract.getYearMonth(currentTimestamp!.timestamp);

    // Get encrypted totals
    const encryptedIncome = await financeGuardContract.getEncryptedMonthlyIncome(
      signers.alice.address,
      yearMonth
    );
    const encryptedExpense = await financeGuardContract.getEncryptedMonthlyExpense(
      signers.alice.address,
      yearMonth
    );

    // Decrypt and verify
    const decryptedIncome = await fhevm.userDecryptEuint(
      FhevmType.euint32,
      encryptedIncome,
      financeGuardContractAddress,
      signers.alice,
    );
    const decryptedExpense = await fhevm.userDecryptEuint(
      FhevmType.euint32,
      encryptedExpense,
      financeGuardContractAddress,
      signers.alice,
    );

    expect(decryptedIncome).to.eq(incomeAmount1 + incomeAmount2);
    expect(decryptedExpense).to.eq(expenseAmount);
  });

  it("should allow multiple users to have separate transactions", async function () {
    const aliceAmount = 100000;
    const bobAmount = 50000;

    // Alice's transaction
    const encryptedAlice = await fhevm
      .createEncryptedInput(financeGuardContractAddress, signers.alice.address)
      .add32(aliceAmount)
      .encrypt();

    await financeGuardContract
      .connect(signers.alice)
      .addTransaction(0, "Alice Income", encryptedAlice.handles[0], encryptedAlice.inputProof, "Salary", true);

    // Bob's transaction
    const encryptedBob = await fhevm
      .createEncryptedInput(financeGuardContractAddress, signers.bob.address)
      .add32(bobAmount)
      .encrypt();

    await financeGuardContract
      .connect(signers.bob)
      .addTransaction(0, "Bob Income", encryptedBob.handles[0], encryptedBob.inputProof, "Salary", true);

    const aliceCount = await financeGuardContract.getUserTransactionCount(signers.alice.address);
    const bobCount = await financeGuardContract.getUserTransactionCount(signers.bob.address);

    expect(aliceCount).to.eq(1);
    expect(bobCount).to.eq(1);

    const aliceTransaction = await financeGuardContract.getTransaction(signers.alice.address, 0);
    const bobTransaction = await financeGuardContract.getTransaction(signers.bob.address, 0);

    const aliceDecrypted = await fhevm.userDecryptEuint(
      FhevmType.euint32,
      aliceTransaction.encryptedAmount,
      financeGuardContractAddress,
      signers.alice,
    );
    const bobDecrypted = await fhevm.userDecryptEuint(
      FhevmType.euint32,
      bobTransaction.encryptedAmount,
      financeGuardContractAddress,
      signers.bob,
    );

    expect(aliceDecrypted).to.eq(aliceAmount);
    expect(bobDecrypted).to.eq(bobAmount);
  });

  it("should reject empty description", async function () {
    const amountInCents = 10000;
    const encryptedAmount = await fhevm
      .createEncryptedInput(financeGuardContractAddress, signers.alice.address)
      .add32(amountInCents)
      .encrypt();

    await expect(
      financeGuardContract
        .connect(signers.alice)
        .addTransaction(0, "", encryptedAmount.handles[0], encryptedAmount.inputProof, "Salary", true)
    ).to.be.revertedWith("Description cannot be empty");
  });

  it("should reject empty category", async function () {
    const amountInCents = 10000;
    const encryptedAmount = await fhevm
      .createEncryptedInput(financeGuardContractAddress, signers.alice.address)
      .add32(amountInCents)
      .encrypt();

    await expect(
      financeGuardContract
        .connect(signers.alice)
        .addTransaction(0, "Salary", encryptedAmount.handles[0], encryptedAmount.inputProof, "", true)
    ).to.be.revertedWith("Category cannot be empty");
  });

  it("should handle transaction index out of bounds", async function () {
    await expect(
      financeGuardContract.getTransaction(signers.alice.address, 0)
    ).to.be.revertedWith("Transaction index out of bounds");
  });

  it("should handle multiple transactions in sequence", async function () {
    const amounts = [10000, 20000, 30000];
    let totalIncome = 0;

    for (let i = 0; i < amounts.length; i++) {
      const encryptedAmount = await fhevm
        .createEncryptedInput(financeGuardContractAddress, signers.alice.address)
        .add32(amounts[i])
        .encrypt();

      await financeGuardContract
        .connect(signers.alice)
        .addTransaction(0, `Income ${i + 1}`, encryptedAmount.handles[0], encryptedAmount.inputProof, "Salary", true);
      
      totalIncome += amounts[i];
    }

    const count = await financeGuardContract.getUserTransactionCount(signers.alice.address);
    expect(count).to.eq(amounts.length);

    const allTransactions = await financeGuardContract.getUserTransactions(signers.alice.address);
    expect(allTransactions.length).to.eq(amounts.length);
  });
});

