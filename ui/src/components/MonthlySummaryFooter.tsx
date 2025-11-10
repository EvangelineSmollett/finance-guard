import { useEffect, useState } from "react";
import { useReadContract } from "wagmi";
import { useAccount } from "wagmi";
import { CONTRACT_ABI } from "@/config/contracts";
import { useContractAddress } from "@/hooks/useContractAddress";
import { formatCurrency, centsToDollars, getYearMonth } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";

type Transaction = {
  id: bigint;
  user: string;
  transactionType: number;
  description: string;
  encryptedAmount: string;
  category: string;
  timestamp: bigint;
  isEncrypted: boolean;
};

type MonthlySummaryFooterProps = {
  transactions: Transaction[];
  decryptedAmounts: Map<number, number>;
  fhevmInstance: any | undefined;
  contractAddress: `0x${string}` | undefined;
  userAddress: `0x${string}` | undefined;
};

export function MonthlySummaryFooter({
  transactions,
  decryptedAmounts,
  fhevmInstance,
  contractAddress,
  userAddress,
}: MonthlySummaryFooterProps) {
  const [monthlyIncome, setMonthlyIncome] = useState<number>(0);
  const [monthlyExpense, setMonthlyExpense] = useState<number>(0);

  // Calculate from decrypted transactions
  useEffect(() => {
    console.log("MonthlySummaryFooter: Calculating totals", { 
      transactionsCount: transactions.length, 
      decryptedCount: decryptedAmounts.size 
    });

    if (transactions.length === 0) {
      setMonthlyIncome(0);
      setMonthlyExpense(0);
      return;
    }

    const now = Date.now() / 1000;
    const currentYearMonth = getYearMonth(now);
    console.log("Current year-month:", currentYearMonth);

    let income = 0;
    let expense = 0;

    transactions.forEach((tx, index) => {
      const txYearMonth = getYearMonth(Number(tx.timestamp));
      console.log(`Transaction ${index}:`, {
        txYearMonth,
        currentYearMonth,
        matches: txYearMonth === currentYearMonth,
        amount: decryptedAmounts.get(index),
        type: tx.transactionType === 0 ? "Income" : "Expense"
      });

      if (txYearMonth === currentYearMonth) {
        const amount = decryptedAmounts.get(index);
        if (amount !== undefined) {
          const amountInDollars = centsToDollars(amount);
          if (tx.transactionType === 0) {
            income += amountInDollars;
          } else {
            expense += amountInDollars;
          }
        }
      }
    });

    console.log("Calculated totals:", { income, expense });
    setMonthlyIncome(income);
    setMonthlyExpense(expense);
  }, [transactions, decryptedAmounts]);

  const netBalance = monthlyIncome - monthlyExpense;

  return (
    <footer className="border-t bg-card mt-auto">
      <div className="container mx-auto px-4 py-4">
        <Card>
          <CardContent className="pt-6">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-sm text-muted-foreground">Monthly Income</p>
                <p className="text-2xl font-bold text-green-600">
                  {formatCurrency(monthlyIncome)}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Monthly Expense</p>
                <p className="text-2xl font-bold text-red-600">
                  {formatCurrency(monthlyExpense)}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Net Balance</p>
                <p
                  className={`text-2xl font-bold ${
                    netBalance >= 0 ? "text-green-600" : "text-red-600"
                  }`}
                >
                  {formatCurrency(netBalance)}
                </p>
              </div>
            </div>
            {transactions.length > 0 && decryptedAmounts.size === 0 && (
              <p className="text-xs text-muted-foreground text-center mt-4">
                Click the lock icon on transactions to decrypt and see totals
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </footer>
  );
}

