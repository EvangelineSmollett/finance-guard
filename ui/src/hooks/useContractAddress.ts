import { useChainId } from "wagmi";
import { CONTRACT_ADDRESSES } from "@/config/contracts";

export function useContractAddress(): `0x${string}` | undefined {
  const chainId = useChainId();
  return CONTRACT_ADDRESSES[chainId];
}


