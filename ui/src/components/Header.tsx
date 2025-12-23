import { ConnectButton } from "@rainbow-me/rainbowkit";
import { Shield } from "lucide-react";

export function Header() {
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-card/80 backdrop-blur supports-[backdrop-filter]:bg-card/60">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center shadow-lg shadow-primary/20">
                <Shield className="h-6 w-6 text-primary-foreground" />
              </div>
              <div className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-green-500 border-2 border-card animate-pulse"></div>
            </div>
            <div>
              <h1 className="text-xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
                Finance Guard
              </h1>
              <p className="text-xs text-muted-foreground font-medium">Finance That Stays Yours</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <ConnectButton />
          </div>
        </div>
      </div>
    </header>
  );
}
