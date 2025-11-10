// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {FHE, euint32, externalEuint32} from "@fhevm/solidity/lib/FHE.sol";
import {SepoliaConfig} from "@fhevm/solidity/config/ZamaConfig.sol";

/// @title FinanceGuard - Encrypted Personal Finance Management
/// @notice A contract for managing personal financial transactions with FHE encryption
/// @dev Transactions can be stored encrypted on-chain, with user-controlled decryption
contract FinanceGuard is SepoliaConfig {
    /// @notice Transaction type enum
    enum TransactionType {
        Income,
        Expense
    }

    /// @notice Transaction struct
    struct Transaction {
        uint256 id;
        address user;
        TransactionType transactionType;
        string description;
        euint32 encryptedAmount; // Encrypted amount in cents (e.g., $25.00 = 2500 cents)
        string category;
        uint256 timestamp;
        bool isEncrypted; // Whether the transaction is currently encrypted
    }

    /// @notice Mapping from user address to their transactions
    mapping(address => Transaction[]) public userTransactions;

    /// @notice Mapping from user address to transaction count
    mapping(address => uint256) public userTransactionCount;

    /// @notice Encrypted monthly totals per user
    mapping(address => mapping(uint256 => euint32)) public encryptedMonthlyIncome; // yearMonth => encrypted total
    mapping(address => mapping(uint256 => euint32)) public encryptedMonthlyExpense; // yearMonth => encrypted total

    /// @notice Events
    event TransactionAdded(
        address indexed user,
        uint256 indexed transactionId,
        TransactionType transactionType,
        string description,
        string category,
        uint256 timestamp,
        bool isEncrypted
    );

    event TransactionEncryptionToggled(
        address indexed user,
        uint256 indexed transactionId,
        bool isEncrypted
    );

    /// @notice Helper function to get year-month from timestamp
    /// @param timestamp Unix timestamp
    /// @return yearMonth Year and month as uint256 (e.g., 202412)
    function getYearMonth(uint256 timestamp) public pure returns (uint256) {
        // Convert timestamp to date components
        // This is a simplified calculation - in production, consider using a library
        uint256 secondsInDay = 86400;
        uint256 daysSinceEpoch = timestamp / secondsInDay;
        
        // Approximate year calculation (accounting for leap years)
        uint256 year = 1970;
        uint256 remainingDays = daysSinceEpoch;
        
        // Simple year calculation (not perfectly accurate but sufficient for grouping)
        while (remainingDays >= 365) {
            if ((year % 4 == 0 && year % 100 != 0) || (year % 400 == 0)) {
                if (remainingDays >= 366) {
                    remainingDays -= 366;
                    year++;
                } else {
                    break;
                }
            } else {
                remainingDays -= 365;
                year++;
            }
        }
        
        // Approximate month calculation
        uint256 month = (remainingDays / 30) + 1;
        if (month > 12) month = 12;
        
        return year * 100 + month;
    }

    /// @notice Add a new transaction
    /// @param transactionType Income or Expense
    /// @param description Transaction description
    /// @param encryptedAmount Encrypted amount in cents
    /// @param inputProof Proof for the encrypted amount
    /// @param category Transaction category
    /// @param encryptOnChain Whether to encrypt this transaction on-chain
    function addTransaction(
        TransactionType transactionType,
        string memory description,
        externalEuint32 encryptedAmount,
        bytes calldata inputProof,
        string memory category,
        bool encryptOnChain
    ) external {
        euint32 amount = FHE.fromExternal(encryptedAmount, inputProof);

        uint256 transactionId = userTransactionCount[msg.sender];
        uint256 timestamp = block.timestamp;
        uint256 yearMonth = getYearMonth(timestamp);

        Transaction memory newTransaction = Transaction({
            id: transactionId,
            user: msg.sender,
            transactionType: transactionType,
            description: description,
            encryptedAmount: amount,
            category: category,
            timestamp: timestamp,
            isEncrypted: encryptOnChain
        });

        userTransactions[msg.sender].push(newTransaction);
        userTransactionCount[msg.sender]++;

        // Allow user to decrypt their transaction amount
        if (encryptOnChain) {
            FHE.allowThis(amount);
            FHE.allow(amount, msg.sender);
        }

        emit TransactionAdded(
            msg.sender,
            transactionId,
            transactionType,
            description,
            category,
            timestamp,
            encryptOnChain
        );
    }

    /// @notice Get all transactions for a user
    /// @param user User address
    /// @return transactions Array of user transactions
    function getUserTransactions(address user) external view returns (Transaction[] memory) {
        return userTransactions[user];
    }

    /// @notice Get transaction count for a user
    /// @param user User address
    /// @return count Number of transactions
    function getUserTransactionCount(address user) external view returns (uint256) {
        return userTransactionCount[user];
    }

    /// @notice Get a specific transaction
    /// @param user User address
    /// @param index Transaction index
    /// @return transaction The transaction
    function getTransaction(address user, uint256 index) external view returns (Transaction memory) {
        require(index < userTransactionCount[user], "Transaction index out of bounds");
        return userTransactions[user][index];
    }

    /// @notice Get encrypted monthly income for a user
    /// @param user User address
    /// @param yearMonth Year and month as uint256 (e.g., 202412 for December 2024)
    /// @return encryptedIncome Encrypted monthly income
    function getEncryptedMonthlyIncome(address user, uint256 yearMonth)
        external
        view
        returns (euint32)
    {
        return encryptedMonthlyIncome[user][yearMonth];
    }

    /// @notice Get encrypted monthly expense for a user
    /// @param user User address
    /// @param yearMonth Year and month as uint256 (e.g., 202412 for December 2024)
    /// @return encryptedExpense Encrypted monthly expense
    function getEncryptedMonthlyExpense(address user, uint256 yearMonth)
        external
        view
        returns (euint32)
    {
        return encryptedMonthlyExpense[user][yearMonth];
    }
}

