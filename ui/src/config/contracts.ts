// Contract addresses for different networks
// This file will be auto-generated after contract deployment
export const CONTRACT_ADDRESSES: Record<number, `0x${string}`> = {
  31337: "0x5FbDB2315678afecb367f032d93F642f64180aa3", // Local Hardhat network - Update after deployment
  11155111: "0x96706d608041C80F482DbC85374920675812CF11", // Sepolia testnet
} as const;

// Contract ABI - This will be generated from the compiled contract
export const CONTRACT_ABI = [
  {
    "type": "function",
    "name": "addTransaction",
    "inputs": [
      { "name": "transactionType", "type": "uint8", "internalType": "enum FinanceGuard.TransactionType" },
      { "name": "description", "type": "string", "internalType": "string" },
      { "name": "encryptedAmount", "type": "bytes32", "internalType": "externalEuint32" },
      { "name": "inputProof", "type": "bytes", "internalType": "bytes" },
      { "name": "category", "type": "string", "internalType": "string" },
      { "name": "encryptOnChain", "type": "bool", "internalType": "bool" }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "getUserTransactions",
    "inputs": [
      { "name": "user", "type": "address", "internalType": "address" }
    ],
    "outputs": [
      {
        "name": "",
        "type": "tuple[]",
        "internalType": "struct FinanceGuard.Transaction[]",
        "components": [
          { "name": "id", "type": "uint256" },
          { "name": "user", "type": "address" },
          { "name": "transactionType", "type": "uint8" },
          { "name": "description", "type": "string" },
          { "name": "encryptedAmount", "type": "bytes32" },
          { "name": "category", "type": "string" },
          { "name": "timestamp", "type": "uint256" },
          { "name": "isEncrypted", "type": "bool" }
        ]
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "getUserTransactionCount",
    "inputs": [
      { "name": "user", "type": "address", "internalType": "address" }
    ],
    "outputs": [
      { "name": "", "type": "uint256", "internalType": "uint256" }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "getTransaction",
    "inputs": [
      { "name": "user", "type": "address", "internalType": "address" },
      { "name": "index", "type": "uint256", "internalType": "uint256" }
    ],
    "outputs": [
      {
        "name": "",
        "type": "tuple",
        "internalType": "struct FinanceGuard.Transaction",
        "components": [
          { "name": "id", "type": "uint256" },
          { "name": "user", "type": "address" },
          { "name": "transactionType", "type": "uint8" },
          { "name": "description", "type": "string" },
          { "name": "encryptedAmount", "type": "bytes32" },
          { "name": "category", "type": "string" },
          { "name": "timestamp", "type": "uint256" },
          { "name": "isEncrypted", "type": "bool" }
        ]
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "getEncryptedMonthlyIncome",
    "inputs": [
      { "name": "user", "type": "address", "internalType": "address" },
      { "name": "yearMonth", "type": "uint256", "internalType": "uint256" }
    ],
    "outputs": [
      { "name": "", "type": "bytes32", "internalType": "euint32" }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "getEncryptedMonthlyExpense",
    "inputs": [
      { "name": "user", "type": "address", "internalType": "address" },
      { "name": "yearMonth", "type": "uint256", "internalType": "uint256" }
    ],
    "outputs": [
      { "name": "", "type": "bytes32", "internalType": "euint32" }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "getYearMonth",
    "inputs": [
      { "name": "timestamp", "type": "uint256", "internalType": "uint256" }
    ],
    "outputs": [
      { "name": "", "type": "uint256", "internalType": "uint256" }
    ],
    "stateMutability": "pure"
  },
  {
    "type": "event",
    "name": "TransactionAdded",
    "inputs": [
      { "name": "user", "type": "address", "indexed": true },
      { "name": "transactionId", "type": "uint256", "indexed": true },
      { "name": "transactionType", "type": "uint8", "indexed": false },
      { "name": "description", "type": "string", "indexed": false },
      { "name": "category", "type": "string", "indexed": false },
      { "name": "timestamp", "type": "uint256", "indexed": false },
      { "name": "isEncrypted", "type": "bool", "indexed": false }
    ]
  }
] as const;

