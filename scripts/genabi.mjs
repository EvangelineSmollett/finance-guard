// Script to generate ABI from compiled contracts
// This will be used to update the frontend contract configuration
import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

const contractArtifactPath = join(process.cwd(), 'artifacts', 'contracts', 'FinanceGuard.sol', 'FinanceGuard.json');
const outputPath = join(process.cwd(), 'ui', 'src', 'config', 'contracts.ts');

try {
  const artifact = JSON.parse(readFileSync(contractArtifactPath, 'utf-8'));
  const abi = artifact.abi;
  
  // Generate TypeScript file with ABI
  const content = `// Auto-generated from contract compilation
// Run 'npm run genabi' after compiling contracts

export const CONTRACT_ABI = ${JSON.stringify(abi, null, 2)} as const;

// Update these addresses after deployment
export const CONTRACT_ADDRESSES: Record<number, \`0x\${string}\`> = {
  31337: "0x0000000000000000000000000000000000000000", // Local Hardhat
  11155111: "0x0000000000000000000000000000000000000000", // Sepolia
} as const;
`;

  writeFileSync(outputPath, content, 'utf-8');
  console.log('✅ ABI generated successfully!');
} catch (error) {
  console.error('❌ Error generating ABI:', error.message);
  process.exit(1);
}


