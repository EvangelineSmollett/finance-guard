import { useMemo } from "react";
import { useAccount, useWalletClient } from "wagmi";
import { BrowserProvider } from "ethers";

export function useEthersSigner() {
  const { address } = useAccount();
  const { data: walletClient } = useWalletClient();

  return useMemo(() => {
    if (!walletClient || !address) return undefined;
    return new BrowserProvider(walletClient as any).getSigner();
  }, [walletClient, address]);
}

