import { useState, useEffect } from "react";
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { CONTRACT_ABI } from "@/config/contracts";
import { dollarsToCents } from "@/lib/utils";
import { toast } from "sonner";
import type { FhevmInstance } from "@/fhevm/fhevmTypes";
import { hexlify, isBytesLike } from "ethers";

type AddTransactionDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  fhevmInstance: FhevmInstance | undefined;
  contractAddress: `0x${string}` | undefined;
};

const incomeCategories = ["Salary", "Freelance", "Investment", "Gift", "Other"];
const expenseCategories = ["Food", "Transport", "Shopping", "Bills", "Entertainment", "Other"];

export function AddTransactionDialog({
  open,
  onOpenChange,
  onSuccess,
  fhevmInstance,
  contractAddress,
}: AddTransactionDialogProps) {
  const [transactionType, setTransactionType] = useState<"income" | "expense">("expense");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("");
  const [encryptOnChain, setEncryptOnChain] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { address } = useAccount();

  const { writeContract, data: hash, error: writeError, isPending } = useWriteContract();
  const { isLoading: isConfirming, isSuccess, isError: txError } = useWaitForTransactionReceipt({
    hash,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();

    console.log("Form submitted");
    console.log("Form state:", { description, amount, category, transactionType, encryptOnChain });

    if (!fhevmInstance) {
      console.error("Missing required data:", { fhevmInstance: !!fhevmInstance, contractAddress, address });
      toast.error("Encryption service not ready. Please wait for initialization or check your network connection.");
      return;
    }

    if (!contractAddress) {
      toast.error("Contract not deployed. Please check the contract address configuration.");
      return;
    }

    if (!address) {
      toast.error("Wallet not connected. Please connect your wallet first.");
      return;
    }

    if (!description || !amount || !category) {
      toast.error("Please fill in all fields");
      return;
    }

    const amountInCents = dollarsToCents(parseFloat(amount));
    if (isNaN(amountInCents) || amountInCents <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }

    setIsSubmitting(true);

    try {
      toast.error("Transaction submission not implemented");
      setIsSubmitting(false);
    } catch (error: any) {
      console.error("Error adding transaction:", error);
      toast.error(error.message || "Failed to add transaction");
      setIsSubmitting(false);
    }
  };

  useEffect(() => {
    if (writeError) {
      console.error("Write contract error:", writeError);
      toast.error(writeError.message || "Failed to submit transaction");
      setIsSubmitting(false);
    }
  }, [writeError]);

  useEffect(() => {
    if (txError) {
      console.error("Transaction error:", txError);
      toast.error("Transaction failed");
      setIsSubmitting(false);
    }
  }, [txError]);

  useEffect(() => {
    if (isSuccess) {
      toast.success("Transaction added successfully!");
      // Reset form
      setDescription("");
      setAmount("");
      setCategory("");
      setEncryptOnChain(true);
      setIsSubmitting(false);
      onSuccess();
    }
  }, [isSuccess, onSuccess]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Transaction</DialogTitle>
          <DialogDescription>
            Record a new income or expense transaction. Amounts can be encrypted on-chain.
          </DialogDescription>
          {!fhevmInstance && (
            <div className="mt-2 p-2 bg-yellow-500/10 border border-yellow-500/30 rounded text-sm text-yellow-600">
              ⚠️ Encryption service is initializing. Please wait...
            </div>
          )}
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <div className="space-y-2">
            <Label>Type</Label>
            <Select
              value={transactionType}
              onValueChange={(value: "income" | "expense") => {
                setTransactionType(value);
                setCategory(""); // Reset category when type changes
              }}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="income">Income</SelectItem>
                <SelectItem value="expense">Expense</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Description</Label>
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g., Grocery shopping"
              required
            />
          </div>

          <div className="space-y-2">
            <Label>Amount ($)</Label>
            <Input
              type="number"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              required
            />
          </div>

          <div className="space-y-2">
            <Label>Category</Label>
            <Select value={category} onValueChange={setCategory} required>
              <SelectTrigger>
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                {(transactionType === "income" ? incomeCategories : expenseCategories).map(
                  (cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat}
                    </SelectItem>
                  )
                )}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between space-x-2">
            <Label htmlFor="encrypt">Encrypt this transaction on-chain</Label>
            <Switch
              id="encrypt"
              checked={encryptOnChain}
              onCheckedChange={setEncryptOnChain}
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting || isConfirming}
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={isSubmitting || isConfirming || isPending || !fhevmInstance}
            >
              {isSubmitting || isConfirming || isPending ? "Adding..." : "Add Transaction"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

