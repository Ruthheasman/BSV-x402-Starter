import { ProtoWallet, PrivateKey } from "@bsv/sdk";

let walletInstance: ProtoWallet | null = null;
let walletConfigured = false;

export function getWallet(): ProtoWallet | null {
  if (walletInstance) return walletInstance;

  const privateKeyHex = process.env.SERVER_PRIVATE_KEY;
  if (!privateKeyHex) {
    console.warn(
      "[wallet] SERVER_PRIVATE_KEY not set. BSV auth/payment middleware will be disabled. " +
      "Set this environment variable with your hex-encoded private key to enable payments."
    );
    walletConfigured = false;
    return null;
  }

  try {
    const privateKey = PrivateKey.fromString(privateKeyHex, "hex");
    walletInstance = new ProtoWallet(privateKey);
    walletConfigured = true;
    console.log("[wallet] Wallet initialized successfully");
    return walletInstance;
  } catch (error) {
    console.error("[wallet] Failed to initialize wallet:", error);
    walletConfigured = false;
    return null;
  }
}

export function isWalletConfigured(): boolean {
  if (walletInstance) return true;
  getWallet();
  return walletConfigured;
}

export function getPublicKey(): string {
  const wallet = getWallet();
  if (!wallet) return "not-configured";
  try {
    const privateKeyHex = process.env.SERVER_PRIVATE_KEY!;
    const privateKey = PrivateKey.fromString(privateKeyHex, "hex");
    return privateKey.toPublicKey().toString();
  } catch {
    return "not-configured";
  }
}
