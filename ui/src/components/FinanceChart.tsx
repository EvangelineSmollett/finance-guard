import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { formatCurrency, centsToDollars, getYearMonth } from "@/lib/utils";
import { TrendingUp, DollarSign } from "lucide-react";

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

type FinanceChartProps = {
  transactions: Transaction[];
  decryptedAmounts: Map<number, number>;
};

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

export function FinanceChart({ transactions, decryptedAmounts }: FinanceChartProps) {
  // Prepare monthly data
  const monthlyData = useMemo(() => {
    const monthlyMap = new Map<string, { income: number; expense: number; month: string }>();
    
    transactions.forEach((tx, index) => {
      const amount = decryptedAmounts.get(index);
      if (amount === undefined) return;
      
      const date = new Date(Number(tx.timestamp) * 1000);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const monthLabel = date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
      const amountInDollars = centsToDollars(amount);
      
      if (!monthlyMap.has(monthKey)) {
        monthlyMap.set(monthKey, { income: 0, expense: 0, month: monthLabel });
      }
      
      const data = monthlyMap.get(monthKey)!;
      if (tx.transactionType === 0) {
        data.income += amountInDollars;
      } else {
        data.expense += amountInDollars;
      }
    });
    
    return Array.from(monthlyMap.values())
      .sort((a, b) => a.month.localeCompare(b.month))
      .slice(-6); // Show last 6 months
  }, [transactions, decryptedAmounts]);

  // Prepare category data
  const categoryData = useMemo(() => {
    const categoryMap = new Map<string, number>();
    
    transactions.forEach((tx, index) => {
      const amount = decryptedAmounts.get(index);
      if (amount === undefined) return;
      
      const amountInDollars = centsToDollars(amount);
      const current = categoryMap.get(tx.category) || 0;
      categoryMap.set(tx.category, current + amountInDollars);
    });
    
    return Array.from(categoryMap.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 6); // Top 6 categories
  }, [transactions, decryptedAmounts]);

  // Calculate totals
  const totals = useMemo(() => {
    let totalIncome = 0;
    let totalExpense = 0;
    
    transactions.forEach((tx, index) => {
      const amount = decryptedAmounts.get(index);
      if (amount === undefined) return;
      
      const amountInDollars = centsToDollars(amount);
      if (tx.transactionType === 0) {
        totalIncome += amountInDollars;
      } else {
        totalExpense += amountInDollars;
      }
    });
    
    return { totalIncome, totalExpense, net: totalIncome - totalExpense };
  }, [transactions, decryptedAmounts]);

  if (decryptedAmounts.size === 0) {
    return (
      <Card className="gradient-card border-primary/20 shadow-lg">
        <CardContent className="pt-6">
          <div className="text-center py-12 text-muted-foreground">
            <DollarSign className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Decrypt transactions to view charts and statistics</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Monthly Trend Chart */}
      {monthlyData.length > 0 && (
        <Card className="gradient-card border-primary/20 shadow-lg">
          <CardHeader>
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              <CardTitle>Monthly Trends</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis 
                  dataKey="month" 
                  stroke="hsl(var(--muted-foreground))"
                  style={{ fontSize: '12px' }}
                />
                <YAxis 
                  stroke="hsl(var(--muted-foreground))"
                  style={{ fontSize: '12px' }}
                  tickFormatter={(value) => `$${value.toLocaleString()}`}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px'
                  }}
                  formatter={(value: number) => formatCurrency(value)}
                />
                <Legend />
                <Bar dataKey="income" fill="#10b981" name="Income" radius={[8, 8, 0, 0]} />
                <Bar dataKey="expense" fill="#ef4444" name="Expense" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Category Distribution */}
      {categoryData.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="gradient-card border-primary/20 shadow-lg">
            <CardHeader>
              <CardTitle>Category Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={categoryData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {categoryData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }}
                    formatter={(value: number) => formatCurrency(value)}
                  />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Summary Stats */}
          <Card className="gradient-card border-primary/20 shadow-lg">
            <CardHeader>
              <CardTitle>Summary Statistics</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 pt-6">
              <div className="space-y-2">
                <div className="flex justify-between items-center p-4 rounded-lg bg-green-500/10 border border-green-500/20">
                  <span className="text-sm font-medium text-muted-foreground">Total Income</span>
                  <span className="text-2xl font-bold text-green-600">
                    {formatCurrency(totals.totalIncome)}
                  </span>
                </div>
                <div className="flex justify-between items-center p-4 rounded-lg bg-red-500/10 border border-red-500/20">
                  <span className="text-sm font-medium text-muted-foreground">Total Expense</span>
                  <span className="text-2xl font-bold text-red-600">
                    {formatCurrency(totals.totalExpense)}
                  </span>
                </div>
                <div className={`flex justify-between items-center p-4 rounded-lg border ${
                  totals.net >= 0 
                    ? 'bg-green-500/10 border-green-500/20' 
                    : 'bg-red-500/10 border-red-500/20'
                }`}>
                  <span className="text-sm font-medium text-muted-foreground">Net Balance</span>
                  <span className={`text-2xl font-bold ${
                    totals.net >= 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {formatCurrency(totals.net)}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

