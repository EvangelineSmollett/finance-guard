# Finance Guard

A privacy-preserving personal finance management application built on blockchain with FHE (Fully Homomorphic Encryption) technology. This application ensures that only users can view their complete transaction details, while analytics dashboards can only see encrypted summary data.

## 🌐 Live Demo

- **Vercel Deployment**: [https://finance-guard.vercel.app/](https://finance-guard.vercel.app/)
- **Video Demo**: [finance-guard.mp4](./finance-guard.mp4)

## 📋 Core Features

- **Encrypted Transaction Storage**: All transaction amounts are encrypted on-chain using FHE
- **User-Controlled Privacy**: Users can toggle encryption on/off for individual transactions
- **Monthly Summaries**: Encrypted monthly income and expense totals
- **Blockchain Storage**: All data is stored on-chain for security and transparency
- **Real-time Encryption Toggle**: Users can encrypt or decrypt any transaction at any time
- **On-Demand Decryption**: Transactions are only decrypted when users explicitly click the decrypt button

## 💡 Philosophy

**"Finance That Stays Yours"** - Complete user control over financial data privacy.

## 📦 Contract Addresses

### Local Development (Hardhat)
- **Network**: Localhost (Chain ID: 31337)
- **Contract Address**: `0x5FbDB2315678afecb367f032d93F642f64180aa3`
- **Explorer**: N/A (Local network)

### Sepolia Testnet
- **Network**: Sepolia (Chain ID: 11155111)
- **Contract Address**: `0x96706d608041C80F482DbC85374920675812CF11`
- **Explorer**: [Etherscan](https://sepolia.etherscan.io/address/0x96706d608041C80F482DbC85374920675812CF11)

## 🏗️ Project Structure

```
finance-guard/
├── contracts/          # Solidity smart contracts
│   └── FinanceGuard.sol
├── test/              # Test scripts
│   ├── FinanceGuard.ts
│   └── FinanceGuardSepolia.ts
├── deploy/            # Deployment scripts
│   └── deploy.ts
├── ui/                # Frontend application
│   ├── src/
│   │   ├── components/    # React components
│   │   ├── config/        # Contract and wallet config
│   │   ├── fhevm/         # FHEVM integration
│   │   ├── hooks/         # React hooks
│   │   └── pages/         # Page components
│   └── public/            # Static assets
└── typechain-types/   # TypeScript type definitions
```

## 🔐 Encryption & Decryption Logic

### Encryption Flow (Adding Transaction)

When a user adds a transaction with encryption enabled:

1. **Client-Side Encryption**:
   ```typescript
   // Create encrypted input using FHEVM
   const input = fhevmInstance.createEncryptedInput(contractAddress, userAddress);
   input.add32(amountInCents); // Amount in cents (e.g., $25.00 = 2500)
   const encryptedInput = await input.encrypt();
   ```

2. **Relayer Processing**:
   - The encrypted input is sent to Zama's relayer service (`relayer.testnet.zama.cloud`)
   - The relayer generates a cryptographic proof (`inputProof`) and returns an encrypted handle

3. **On-Chain Storage**:
   ```solidity
   // Contract receives encrypted data
   euint32 amount = FHE.fromExternal(encryptedAmount, inputProof);
   
   // Store encrypted transaction
   userTransactions[msg.sender].push(Transaction({
       encryptedAmount: amount,
       isEncrypted: true,
       // ... other fields
   }));
   
   // Update encrypted monthly totals
   encryptedMonthlyIncome[msg.sender][yearMonth] = FHE.add(
       encryptedMonthlyIncome[msg.sender][yearMonth],
       amount
   );
   ```

4. **Access Control**:
   ```solidity
   // Grant user permission to decrypt their own data
   FHE.allowThis(amount);
   FHE.allow(amount, msg.sender);
   ```

### Decryption Flow (Viewing Transaction)

When a user clicks the decrypt button:

1. **Generate Keypair**:
   ```typescript
   const keypair = fhevmInstance.generateKeypair();
   ```

2. **Create EIP-712 Signature**:
   ```typescript
   const handleContractPairs = [{ 
       handle: encryptedAmountHandle, 
       contractAddress: contractAddress 
   }];
   const eip712 = fhevmInstance.createEIP712(
       keypair.publicKey, 
       [contractAddress], 
       startTimeStamp, 
       durationDays
   );
   const signature = await signTypedDataAsync({
       domain: eip712.domain,
       types: { UserDecryptRequestVerification: eip712.types.UserDecryptRequestVerification },
       primaryType: 'UserDecryptRequestVerification',
       message: eip712.message,
   });
   ```

3. **Request Decryption**:
   ```typescript
   const result = await fhevmInstance.userDecrypt(
       handleContractPairs,
       keypair.privateKey,
       keypair.publicKey,
       signature.replace('0x', ''),
       [contractAddress],
       userAddress,
       startTimeStamp,
       durationDays,
   );
   ```

4. **Display Decrypted Value**:
   ```typescript
   const decryptedValue = result[encryptedAmountHandle] as bigint;
   const amount = Number(decryptedValue); // Convert to cents
   ```

### Key Security Features

- **Zero-Knowledge Proofs**: All encrypted inputs are verified using ZK proofs before being accepted on-chain
- **User-Controlled Access**: Only the transaction owner can decrypt their data
- **On-Demand Decryption**: Data remains encrypted until explicitly decrypted by the user
- **Homomorphic Operations**: Monthly totals are computed on encrypted data without decryption

## 📝 Smart Contract

### FinanceGuard.sol

The main contract that manages encrypted transactions:

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {FHE, euint32, externalEuint32} from "@fhevm/solidity/lib/FHE.sol";
import {SepoliaConfig} from "@fhevm/solidity/config/ZamaConfig.sol";

contract FinanceGuard is SepoliaConfig {
    enum TransactionType {
        Income,
        Expense
    }

    struct Transaction {
        uint256 id;
        address user;
        TransactionType transactionType;
        string description;
        euint32 encryptedAmount; // Encrypted amount in cents
        string category;
        uint256 timestamp;
        bool isEncrypted;
    }

    mapping(address => Transaction[]) public userTransactions;
    mapping(address => mapping(uint256 => euint32)) public encryptedMonthlyIncome;
    mapping(address => mapping(uint256 => euint32)) public encryptedMonthlyExpense;

    function addTransaction(
        TransactionType transactionType,
        string memory description,
        externalEuint32 encryptedAmount,
        bytes calldata inputProof,
        string memory category,
        bool encryptOnChain
    ) external {
        euint32 amount = FHE.fromExternal(encryptedAmount, inputProof);
        
        // Store transaction
        userTransactions[msg.sender].push(Transaction({
            id: userTransactionCount[msg.sender],
            user: msg.sender,
            transactionType: transactionType,
            description: description,
            encryptedAmount: amount,
            category: category,
            timestamp: block.timestamp,
            isEncrypted: encryptOnChain
        }));

        // Update encrypted monthly totals using homomorphic addition
        uint256 yearMonth = getYearMonth(block.timestamp);
        if (transactionType == TransactionType.Income) {
            encryptedMonthlyIncome[msg.sender][yearMonth] = FHE.add(
                encryptedMonthlyIncome[msg.sender][yearMonth],
                amount
            );
        } else {
            encryptedMonthlyExpense[msg.sender][yearMonth] = FHE.add(
                encryptedMonthlyExpense[msg.sender][yearMonth],
                amount
            );
        }

        // Grant decryption permission to user
        if (encryptOnChain) {
            FHE.allowThis(amount);
            FHE.allow(amount, msg.sender);
        }
    }

    function getUserTransactions(address user) 
        external 
        view 
        returns (Transaction[] memory) 
    {
        return userTransactions[user];
    }

    function getEncryptedMonthlyIncome(address user, uint256 yearMonth)
        external
        view
        returns (euint32)
    {
        return encryptedMonthlyIncome[user][yearMonth];
    }

    function getEncryptedMonthlyExpense(address user, uint256 yearMonth)
        external
        view
        returns (euint32)
    {
        return encryptedMonthlyExpense[user][yearMonth];
    }
}
```

### Contract Functions

#### `addTransaction`
Adds a new income or expense transaction with optional encryption.

**Parameters**:
- `transactionType`: `0` for Income, `1` for Expense
- `description`: Transaction description
- `encryptedAmount`: Encrypted amount handle (bytes32)
- `inputProof`: ZK proof for the encrypted amount
- `category`: Transaction category
- `encryptOnChain`: Whether to encrypt this transaction

#### `getUserTransactions`
Retrieves all transactions for a user.

**Parameters**:
- `user`: User address

**Returns**: Array of `Transaction` structs

#### `getEncryptedMonthlyIncome`
Gets encrypted monthly income total for a user.

**Parameters**:
- `user`: User address
- `yearMonth`: Year and month as uint256 (e.g., 202412 for December 2024)

**Returns**: Encrypted monthly income (`euint32`)

#### `getEncryptedMonthlyExpense`
Gets encrypted monthly expense total for a user.

**Parameters**:
- `user`: User address
- `yearMonth`: Year and month as uint256 (e.g., 202412 for December 2024)

**Returns**: Encrypted monthly expense (`euint32`)

## 🚀 Setup

### Prerequisites

- Node.js >= 20
- npm >= 7.0.0
- A Web3 wallet (MetaMask, Rainbow, etc.)

### Installation

```bash
# Install dependencies
npm install

# Install frontend dependencies
cd ui && npm install
```

## 💻 Development

### Compile Contracts

```bash
npm run compile
```

### Run Tests

```bash
# Local tests
npm run test

# Sepolia testnet tests
npm run test:sepolia
```

### Deploy

```bash
# Deploy to localhost
npm run deploy:localhost

# Deploy to Sepolia (requires environment variables)
export SEPOLIA_RPC_URL=your_rpc_url
export PRIVATE_KEY=your_private_key
npm run deploy:sepolia
```

### Frontend Development

```bash
# Start development server
npm run frontend:dev
```

## 📱 Frontend Features

- **Wallet Connection**: Rainbow wallet integration via Wagmi
- **Transaction Management**: Add, view, and manage transactions
- **On-Demand Decryption**: Click to decrypt individual transactions
- **Monthly Summary**: View encrypted monthly totals
- **Category Management**: Organize transactions by category
- **Real-time Updates**: Automatic refresh after transaction submission

## 🔧 Technology Stack

### Backend
- **Solidity**: Smart contract development
- **Hardhat**: Development environment
- **FHEVM**: Fully Homomorphic Encryption Virtual Machine
- **Zama Network**: FHE relayer service

### Frontend
- **React**: UI framework
- **TypeScript**: Type safety
- **Vite**: Build tool
- **Wagmi**: Ethereum React hooks
- **RainbowKit**: Wallet connection UI
- **Tailwind CSS**: Styling
- **Radix UI**: Component library

## 📚 Key Concepts

### Fully Homomorphic Encryption (FHE)
FHE allows computations to be performed on encrypted data without decrypting it first. In Finance Guard:
- Transaction amounts are encrypted before being stored on-chain
- Monthly totals are computed using homomorphic addition (`FHE.add`)
- Only the transaction owner can decrypt their data

### Encrypted Data Handles
Encrypted values on-chain are represented as "handles" (bytes32). These handles:
- Reference encrypted data stored off-chain
- Can be used in homomorphic operations
- Require user permission to decrypt

### Access Control
The contract uses FHEVM's access control system:
- `FHE.allowThis()`: Allows the contract to perform operations
- `FHE.allow(encryptedValue, user)`: Grants a user permission to decrypt

## 🧪 Testing

### Local Testing

1. Start Hardhat node:
   ```bash
   npm run node
   ```

2. Deploy contract:
   ```bash
   npm run deploy:localhost
   ```

3. Start frontend:
   ```bash
   cd ui && npm run dev
   ```

4. Connect wallet to localhost network (Chain ID: 31337)

### Testnet Testing

1. Ensure you have Sepolia ETH for gas fees
2. Connect wallet to Sepolia testnet
3. Visit [https://finance-guard.vercel.app/](https://finance-guard.vercel.app/)
4. Connect wallet and start testing

## 🔒 Security Considerations

### On-Chain Privacy
- All transaction amounts are encrypted using FHE before being stored on-chain
- Only the transaction owner can decrypt their data using their private key
- Monthly totals are computed using homomorphic operations without decryption
- Zero-knowledge proofs ensure encrypted inputs are valid before acceptance

### Access Control
- Users can only view and decrypt their own transactions
- Contract functions include input validation to prevent invalid operations
- Address validation prevents querying invalid or zero addresses

### Best Practices
- Always verify contract addresses before interacting
- Keep your wallet private keys secure
- Use testnet for development and testing
- Review transaction details before confirming

## 🐛 Troubleshooting

### Common Issues

**FHEVM Not Initializing**
- Ensure you're connected to the correct network (Hardhat Local or Sepolia)
- Check that the relayer service is accessible
- Verify your wallet is properly connected

**Transaction Decryption Fails**
- Ensure the transaction was encrypted when added
- Verify you have permission to decrypt (only the transaction owner can decrypt)
- Check that FHEVM instance is properly initialized

**Deployment Fails**
- Verify environment variables are set correctly for Sepolia
- Ensure you have sufficient ETH for gas fees
- Check network connectivity and RPC endpoint

**Contract Not Found**
- Verify the contract address matches your network
- Ensure the contract has been deployed to the current network
- Check that you're using the correct network configuration

## 📊 Performance Considerations

### Gas Optimization
- Transaction storage uses efficient array structures
- Monthly totals use homomorphic operations to minimize gas costs
- Input validation prevents unnecessary operations

### Frontend Optimization
- Transaction list uses React keys for efficient rendering
- Decryption is performed on-demand to reduce initial load time
- Caching of decrypted values prevents redundant operations

## 🔄 Future Enhancements

Potential improvements for future versions:
- Multi-currency support
- Advanced filtering and search
- Export functionality for transaction data
- Recurring transaction support
- Budget tracking and alerts
- Integration with external financial services

## 🤝 Contributing

Contributions are welcome! Please follow these guidelines:
1. Fork the repository
2. Create a feature branch
3. Make your changes with appropriate tests
4. Submit a pull request with a clear description

## 📞 Support

For issues, questions, or contributions:
- Open an issue on GitHub
- Review the documentation
- Check existing issues for solutions

## 📄 License

MIT

## 🙏 Acknowledgments

- [Zama](https://www.zama.ai/) for FHEVM technology
- [FHEVM Solidity Library](https://github.com/zama-ai/fhevm-solidity)
- [Rainbow](https://rainbow.me/) for wallet integration
