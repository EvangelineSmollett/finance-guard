import { useState, useEffect } from "react";
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt, useWalletClient, useChainId, useSignTypedData } from "wagmi";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { Header } from "@/components/Header";
import { TransactionCard } from "@/components/TransactionCard";
import { MonthlySummaryFooter } from "@/components/MonthlySummaryFooter";
import { AddTransactionDialog } from "@/components/AddTransactionDialog";
import { FinanceChart } from "@/components/FinanceChart";
import { useContractAddress } from "@/hooks/useContractAddress";
import { CONTRACT_ABI } from "@/config/contracts";
import { useFhevm } from "@/fhevm/useFhevm";
import { toast } from "sonner";
import { formatDate, getYearMonth, centsToDollars } from "@/lib/utils";
import { Plus, Shield, Lock, Unlock, Wallet, DollarSign, TrendingUp, BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

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
  const [sortOrder, setSortOrder] = useState<"newest" | "oldest">("newest");
  
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
      const sorted = [...userTransactions].sort((a, b) => {
        if (sortOrder === "newest") {
          return Number(b.timestamp) - Number(a.timestamp);
        } else {
          return Number(a.timestamp) - Number(b.timestamp);
        }
      });
      setTransactions(sorted);
    }
  }, [userTransactions, sortOrder]);

  const { signTypedDataAsync } = useSignTypedData();

  // Decrypt transaction amounts
  const decryptAmount = async (index: number, encryptedAmount: string) => {
    if (!fhevmInstance || !contractAddress || !address) {
      toast.error("FHEVM not ready or wallet not connected");
      return;
    }

    try {
      const encHandle = encryptedAmount as string;
      
      const keypair = fhevmInstance.generateKeypair();
      const handleContractPairs = [{ handle: encHandle, contractAddress: contractAddress }];
      const startTimeStamp = Math.floor(Date.now() / 1000).toString();
      const durationDays = '7';
      const contractAddresses = [contractAddress];
      const eip712 = fhevmInstance.createEIP712(keypair.publicKey, contractAddresses, startTimeStamp, durationDays);
      
      const signature = await signTypedDataAsync({
        domain: eip712.domain,
        types: { UserDecryptRequestVerification: eip712.types.UserDecryptRequestVerification },
        primaryType: 'UserDecryptRequestVerification',
        message: eip712.message,
      });

      const result = await fhevmInstance.userDecrypt(
        handleContractPairs,
        keypair.privateKey,
        keypair.publicKey,
        signature.replace('0x', ''),
        contractAddresses,
        address,
        startTimeStamp,
        durationDays,
      );

      const decryptedValue = result[encHandle] as bigint;
      const amount = Number(decryptedValue);
      setDecryptedAmounts((prev) => new Map(prev.set(index, amount)));
      toast.success("Amount decrypted successfully!");
    } catch (error: any) {
      console.error("Decryption error:", error);
      const errorMessage = error?.message || "Unknown error";
      console.error("Decryption error details:", error);
      toast.error(`Failed to decrypt amount: ${errorMessage}`);
    }
  };

  // Removed auto-decrypt on page load - decryption now only happens when user clicks the decrypt button

  if (!isConnected) {
    return (
      <div className="flex min-h-screen flex-col gradient-bg">
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center space-y-6 max-w-md px-4 animate-fade-in">
            <div className="h-20 w-20 rounded-2xl bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center mx-auto shadow-xl shadow-primary/20">
              <Wallet className="h-10 w-10 text-primary-foreground" />
            </div>
            <div className="space-y-2">
              <h1 className="text-4xl font-bold bg-gradient-to-r from-foreground via-foreground/90 to-foreground/70 bg-clip-text text-transparent">
                Finance Guard
              </h1>
              <p className="text-muted-foreground text-lg">
                Connect your wallet to get started with private finance management
              </p>
            </div>
            <div className="pt-4">
              <ConnectButton />
            </div>
            <div className="pt-8 grid grid-cols-3 gap-4 text-sm">
              <div className="space-y-2">
                <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center mx-auto">
                  <Lock className="h-6 w-6 text-primary" />
                </div>
                <p className="font-medium">Encrypted</p>
                <p className="text-xs text-muted-foreground">Your data stays private</p>
              </div>
              <div className="space-y-2">
                <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center mx-auto">
                  <Shield className="h-6 w-6 text-primary" />
                </div>
                <p className="font-medium">Secure</p>
                <p className="text-xs text-muted-foreground">Blockchain powered</p>
              </div>
              <div className="space-y-2">
                <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center mx-auto">
                  <Wallet className="h-6 w-6 text-primary" />
                </div>
                <p className="font-medium">Decentralized</p>
                <p className="text-xs text-muted-foreground">You own your data</p>
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  // Show FHEVM loading/error states
  if (fhevmStatus === "loading") {
    return (
      <div className="flex min-h-screen flex-col gradient-bg">
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center space-y-4 animate-fade-in">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
            <p className="text-muted-foreground">Initializing encryption service...</p>
            <p className="text-xs text-muted-foreground">This may take a few seconds</p>
          </div>
        </main>
      </div>
    );
  }

  if (fhevmStatus === "error" && fhevmError) {
    return (
      <div className="flex min-h-screen flex-col gradient-bg">
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center space-y-4 max-w-md animate-fade-in">
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
    <div className="flex min-h-screen flex-col gradient-bg">
      <Header />
      <main className="flex-1">
        <div className="container mx-auto px-4 py-8 space-y-8">
          {/* Hero Section with Stats */}
          <div className="space-y-6 animate-fade-in">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="space-y-2">
                <h1 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-foreground via-foreground/90 to-foreground/70 bg-clip-text text-transparent">
                  Your Financial Dashboard
                </h1>
                <p className="text-muted-foreground text-sm sm:text-base">
                  Manage your finances with complete privacy
                </p>
              </div>
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
                <select
                  value={sortOrder}
                  onChange={(e) => setSortOrder(e.target.value as "newest" | "oldest")}
                  className="px-4 py-2 border rounded-lg text-sm bg-card/50 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                >
                  <option value="newest">Newest First</option>
                  <option value="oldest">Oldest First</option>
                </select>
                <Button 
                  onClick={() => setAddDialogOpen(true)} 
                  className="gap-2 w-full sm:w-auto shadow-lg shadow-primary/20 hover:shadow-xl transition-all"
                >
                  <Plus className="h-4 w-4" />
                  Add Transaction
                </Button>
              </div>
            </div>

            {/* Quick Stats Cards */}
            {transactions.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Card className="gradient-card border-primary/20 shadow-lg hover:shadow-xl transition-all animate-slide-up">
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Total Transactions</p>
                        <p className="text-2xl font-bold mt-1">{transactions.length}</p>
                      </div>
                      <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                        <DollarSign className="h-6 w-6 text-primary" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                <Card className="gradient-card border-green-500/20 shadow-lg hover:shadow-xl transition-all animate-slide-up" style={{ animationDelay: '0.1s' }}>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Decrypted</p>
                        <p className="text-2xl font-bold mt-1 text-green-600">{decryptedAmounts.size}</p>
                      </div>
                      <div className="h-12 w-12 rounded-full bg-green-500/10 flex items-center justify-center">
                        <Unlock className="h-6 w-6 text-green-600" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                <Card className="gradient-card border-orange-500/20 shadow-lg hover:shadow-xl transition-all animate-slide-up" style={{ animationDelay: '0.2s' }}>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Encrypted</p>
                        <p className="text-2xl font-bold mt-1 text-orange-600">
                          {transactions.length - decryptedAmounts.size}
                        </p>
                      </div>
                      <div className="h-12 w-12 rounded-full bg-orange-500/10 flex items-center justify-center">
                        <Lock className="h-6 w-6 text-orange-600" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </div>

          {/* Tabs for Transactions and Charts */}
          <Tabs defaultValue="transactions" className="space-y-6">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="transactions" className="gap-2">
                <BarChart3 className="h-4 w-4" />
                Transactions
              </TabsTrigger>
              <TabsTrigger value="analytics" className="gap-2">
                <TrendingUp className="h-4 w-4" />
                Analytics
              </TabsTrigger>
            </TabsList>

            <TabsContent value="transactions" className="space-y-4">
              {transactions.length === 0 ? (
                <Card className="gradient-card border-dashed shadow-lg">
                  <CardContent className="pt-12 pb-12">
                    <div className="text-center space-y-4">
                      <div className="h-16 w-16 rounded-full bg-muted/50 flex items-center justify-center mx-auto">
                        <DollarSign className="h-8 w-8 text-muted-foreground" />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold">No transactions yet</h3>
                        <p className="text-sm text-muted-foreground mt-1">
                          Add your first transaction to get started with Finance Guard
                        </p>
                      </div>
                      <Button 
                        onClick={() => setAddDialogOpen(true)} 
                        className="mt-4 shadow-lg shadow-primary/20"
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Add Your First Transaction
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                transactions.map((tx, index) => (
                  <div 
                    key={`${tx.id}-${index}`}
                    className="animate-slide-up"
                    style={{ animationDelay: `${index * 0.05}s` }}
                  >
                    <TransactionCard
                      transaction={tx}
                      decryptedAmount={decryptedAmounts.get(index)}
                      onDecrypt={() => decryptAmount(index, tx.encryptedAmount)}
                      isDecrypted={decryptedAmounts.has(index)}
                    />
                  </div>
                ))
              )}
            </TabsContent>

            <TabsContent value="analytics" className="space-y-6">
              <FinanceChart 
                transactions={transactions}
                decryptedAmounts={decryptedAmounts}
              />
            </TabsContent>
          </Tabs>
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

