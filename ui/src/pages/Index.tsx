import { useState, useEffect } from "react";
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt, useWalletClient, useChainId, useSignTypedData } from "wagmi";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { Header } from "@/components/Header";
import { TransactionCard } from "@/components/TransactionCard";
import { MonthlySummaryFooter } from "@/components/MonthlySummaryFooter";
import { AddTransactionDialog } from "@/components/AddTransactionDialog";
import { useContractAddress } from "@/hooks/useContractAddress";
import { CONTRACT_ABI } from "@/config/contracts";
import { useFhevm } from "@/fhevm/useFhevm";
import { toast } from "sonner";
import { formatDate, getYearMonth, centsToDollars } from "@/lib/utils";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

type Transaction = {
  id: bigint;
  user: string;
  transactionType: number; // 0 = Income, 1 = Expense
  description: string;
  encryptedAmount: string;
  category: string;
  timestamp: bigint;
  isEncrypted: boolean;
};

export default function Index() {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const { data: walletClient } = useWalletClient();
  const contractAddress = useContractAddress();
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [decryptedAmounts, setDecryptedAmounts] = useState<Map<number, number>>(new Map());
  
  const provider = walletClient ? (walletClient as any) : undefined;
  const { instance: fhevmInstance, status: fhevmStatus, error: fhevmError } = useFhevm({
    provider,
    chainId,
    enabled: !!provider && !!chainId && isConnected,
    initialMockChains: { 31337: "http://127.0.0.1:8545" },
  });

  // Fetch transactions from contract
  const { data: userTransactions, refetch: refetchTransactions } = useReadContract({
    address: contractAddress,
    abi: CONTRACT_ABI,
    functionName: "getUserTransactions",
    args: address ? [address] : undefined,
    query: {
      enabled: !!address && !!contractAddress,
    },
  }) as { data: Transaction[] | undefined; refetch: () => void };

  useEffect(() => {
    if (userTransactions) {
      setTransactions(userTransactions);
    }
  }, [userTransactions]);

  const { signTypedDataAsync } = useSignTypedData();

  // Decrypt transaction amounts
  const decryptAmount = async (index: number, encryptedAmount: string) => {
    if (!fhevmInstance || !contractAddress || !address) {
      toast.error("FHEVM not ready or wallet not connected");
      return;
    }

    try {
      toast.error("Decryption not implemented");
    } catch (error: any) {
      console.error("Decryption error:", error);
      toast.error("Failed to decrypt amount: " + (error?.message || "Unknown error"));
    }
  };

  // Removed auto-decrypt on page load - decryption now only happens when user clicks the decrypt button

  if (!isConnected) {
    return (
      <div className="flex min-h-screen flex-col">
        <Header />
        <main className="flex-1 flex items-center justify-center bg-background">
          <div className="text-center space-y-4">
            <h1 className="text-3xl font-bold">Finance Guard</h1>
            <p className="text-muted-foreground">Connect your wallet to get started</p>
            <ConnectButton />
          </div>
        </main>
      </div>
    );
  }

  // Show FHEVM loading/error states
  if (fhevmStatus === "loading") {
    return (
      <div className="flex min-h-screen flex-col">
        <Header />
        <main className="flex-1 flex items-center justify-center bg-background">
          <div className="text-center space-y-4">
            <p className="text-muted-foreground">Initializing encryption service...</p>
          </div>
        </main>
      </div>
    );
  }

  if (fhevmStatus === "error" && fhevmError) {
    return (
      <div className="flex min-h-screen flex-col">
        <Header />
        <main className="flex-1 flex items-center justify-center bg-background">
          <div className="text-center space-y-4 max-w-md">
            <p className="text-destructive font-semibold">⚠️ Encryption Service Error</p>
            <p className="text-sm text-muted-foreground">{fhevmError.message}</p>
            <p className="text-xs text-muted-foreground mt-4">
              Make sure you're connected to the correct network (Hardhat Local - Chain ID: 31337)
            </p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1 bg-background">
        <div className="container mx-auto px-4 py-8">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">Finance Guard</h1>
              <p className="text-muted-foreground">Finance That Stays Yours</p>
            </div>
            <Button onClick={() => setAddDialogOpen(true)} className="gap-2">
              <Plus className="h-4 w-4" />
              Add Transaction
            </Button>
          </div>

          <div className="space-y-4">
            {transactions.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <p>No transactions yet. Add your first transaction to get started.</p>
              </div>
            ) : (
              transactions.map((tx, index) => (
                <TransactionCard
                  key={index}
                  transaction={tx}
                  decryptedAmount={decryptedAmounts.get(index)}
                  onDecrypt={() => decryptAmount(index, tx.encryptedAmount)}
                  isDecrypted={decryptedAmounts.has(index)}
                />
              ))
            )}
          </div>
        </div>
      </main>

      <MonthlySummaryFooter
        transactions={transactions}
        decryptedAmounts={decryptedAmounts}
        fhevmInstance={fhevmInstance}
        contractAddress={contractAddress}
        userAddress={address}
      />

      <AddTransactionDialog
        open={addDialogOpen}
        onOpenChange={setAddDialogOpen}
        onSuccess={() => {
          refetchTransactions();
          setAddDialogOpen(false);
        }}
        fhevmInstance={fhevmInstance}
        contractAddress={contractAddress}
      />
    </div>
  );
}

