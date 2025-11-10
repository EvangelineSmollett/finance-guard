import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Lock, Unlock, ArrowUpCircle, ArrowDownCircle } from "lucide-react";
import { formatDate, formatCurrency, centsToDollars } from "@/lib/utils";
import { cn } from "@/lib/utils";

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

type TransactionCardProps = {
  transaction: Transaction;
  decryptedAmount?: number;
  onDecrypt: () => void;
  isDecrypted: boolean;
};

export function TransactionCard({
  transaction,
  decryptedAmount,
  onDecrypt,
  isDecrypted,
}: TransactionCardProps) {
  const isIncome = transaction.transactionType === 0;
  const amount = decryptedAmount ? centsToDollars(decryptedAmount) : 0;
  const showEncrypted = transaction.isEncrypted && !isDecrypted;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div className="flex items-center gap-2">
          {isIncome ? (
            <ArrowUpCircle className="h-5 w-5 text-green-600" />
          ) : (
            <ArrowDownCircle className="h-5 w-5 text-red-600" />
          )}
          <div>
            <h3 className="font-semibold">{transaction.description}</h3>
            <p className="text-sm text-muted-foreground">{transaction.category}</p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={onDecrypt}
          disabled={!transaction.isEncrypted || isDecrypted}
        >
          {showEncrypted ? (
            <Lock className="h-4 w-4" />
          ) : (
            <Unlock className="h-4 w-4" />
          )}
        </Button>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">
              {formatDate(Number(transaction.timestamp))}
            </p>
            <Badge variant={isIncome ? "default" : "secondary"}>
              {isIncome ? "Income" : "Expense"}
            </Badge>
          </div>
          <div className="text-right">
            <p
              className={cn(
                "text-2xl font-bold",
                isIncome ? "text-green-600" : "text-red-600",
                showEncrypted && "blur-sm"
              )}
            >
              {showEncrypted ? "•••••" : formatCurrency(amount)}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}


