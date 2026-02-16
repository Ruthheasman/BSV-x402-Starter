import { ProtoWallet, PrivateKey } from "@bsv/sdk";

let walletInstance: ProtoWallet | null = null;
let walletConfigured = false;
let cachedPrivateKey: PrivateKey | null = null;

function parsePrivateKey(keyStr: string): PrivateKey {
  const trimmed = keyStr.trim();
  if (/^[0-9a-fA-F]{64}$/.test(trimmed)) {
    return PrivateKey.fromString(trimmed, "hex");
  }
  return PrivateKey.fromWif(trimmed);
}

export function getWallet(): ProtoWallet | null {
  if (walletInstance) return walletInstance;

  const keyStr = process.env.SERVER_PRIVATE_KEY;
  if (!keyStr) {
    console.warn(
      "[wallet] SERVER_PRIVATE_KEY not set. BSV auth/payment middleware will be disabled. " +
      "Set this environment variable with your hex-encoded or WIF private key to enable payments."
    );
    walletConfigured = false;
    return null;
  }

  try {
    cachedPrivateKey = parsePrivateKey(keyStr);
    walletInstance = new ProtoWallet(cachedPrivateKey);
    walletConfigured = true;
    console.log("[wallet] Wallet initialized successfully");
    console.log("[wallet] Address:", cachedPrivateKey.toAddress());
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
  if (!wallet || !cachedPrivateKey) return "not-configured";
  try {
    return cachedPrivateKey.toPublicKey().toString();
  } catch {
    return "not-configured";
  }
}
