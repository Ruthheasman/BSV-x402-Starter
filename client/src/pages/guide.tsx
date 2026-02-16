import { Link } from "wouter";
import {
  ArrowLeft,
  Copy,
  ChevronRight,
  Terminal,
  Key,
  Settings,
  Code2,
  Rocket,
  TestTube,
  Zap,
} from "lucide-react";
import { SiBitcoin } from "react-icons/si";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ThemeToggle } from "@/components/theme-toggle";
import { useToast } from "@/hooks/use-toast";

function copyToClipboard(text: string, toast: ReturnType<typeof useToast>["toast"]) {
  navigator.clipboard.writeText(text);
  toast({ title: "Copied to clipboard" });
}

function CodeBlock({ code, label }: { code: string; label?: string }) {
  const { toast } = useToast();
  return (
    <div className="relative group" data-testid={`codeblock-${label || "default"}`}>
      {label && (
        <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground mb-1">{label}</div>
      )}
      <pre className="text-sm font-mono bg-muted/50 border border-border rounded-lg p-4 overflow-x-auto text-foreground whitespace-pre-wrap leading-relaxed">
        {code}
      </pre>
      <Button
        size="icon"
        variant="ghost"
        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
        onClick={() => copyToClipboard(code, toast)}
        data-testid={`button-copy-${label || "default"}`}
      >
        <Copy className="w-3 h-3" />
      </Button>
    </div>
  );
}

function StepCard({ step, title, icon: Icon, children }: { step: number; title: string; icon: any; children: React.ReactNode }) {
  return (
    <Card className="border-border" data-testid={`card-step-${step}`}>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-sm font-bold text-primary">
            {step}
          </div>
          <Icon className="w-5 h-5 text-primary" />
          <CardTitle className="text-lg">{title}</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-4 text-sm text-muted-foreground leading-relaxed">
        {children}
      </CardContent>
    </Card>
  );
}

export default function Guide() {
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 backdrop-blur-md bg-background/80 border-b border-border">
        <div className="max-w-3xl mx-auto px-6 h-14 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link href="/">
              <Button variant="ghost" size="sm" className="gap-2" data-testid="button-back-home">
                <ArrowLeft className="w-4 h-4" />
                <SiBitcoin className="w-4 h-4 text-primary" />
                <span className="font-semibold text-sm">BSV x402 Starter</span>
              </Button>
            </Link>
          </div>
          <ThemeToggle />
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-12 space-y-10">
        <div>
          <Badge variant="outline" className="mb-4 text-xs" data-testid="badge-guide">Integration Guide</Badge>
          <h1 className="text-3xl font-bold tracking-tight" data-testid="text-guide-title">
            Add BSV Micropayments to Your App
          </h1>
          <p className="mt-3 text-muted-foreground leading-relaxed max-w-2xl">
            This guide walks you through integrating BSV x402 micropayments into an existing application.
            You'll go from zero to paid API endpoints in under an hour.
          </p>
        </div>

        <Separator />

        <div className="space-y-8">

          <StepCard step={1} title="Generate a BSV Private Key" icon={Key}>
            <p>
              You need a BSV private key to sign authentication challenges and receive payments.
              Generate one using the BSV SDK:
            </p>
            <CodeBlock
              label="generate-key"
              code={`import { PrivateKey } from '@bsv/sdk'

const key = PrivateKey.fromRandom()
console.log(key.toHex())
// e.g. "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"`}
            />
            <p>
              Copy the hex output and set it as the <code className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">SERVER_PRIVATE_KEY</code> environment
              variable in your Replit project (via the Secrets tab). This enables BRC-103/104 authentication and BRC-29/105 payments.
            </p>
            <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3 flex gap-2">
              <Zap className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <span className="text-amber-700 dark:text-amber-300 text-xs">
                Without this key set, the app runs in <strong>demo mode</strong> — all endpoints are accessible without auth or payment. This is useful for testing your business logic first.
              </span>
            </div>
          </StepCard>

          <StepCard step={2} title="Define Your Endpoints" icon={Settings}>
            <p>
              Open <code className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">server/config.ts</code> and
              replace the example endpoints with your own. Each endpoint defines a path, HTTP method, price in satoshis, and a handler name:
            </p>
            <CodeBlock
              label="config"
              code={`// server/config.ts
export const endpoints: EndpointConfig[] = [
  {
    path: "/api/generate-summary",
    method: "POST",
    price: 5000,            // ~$0.30 USD
    handler: "generateSummary",
    tier: "standard",
    description: "Generate an AI summary of a document",
    accepts: {
      contentType: "application/json",
      body: { text: "string (required)", maxLength: "number (optional)" },
    },
    returns: {
      contentType: "application/json",
      body: { summary: "string", wordCount: "number" },
    },
  },
  {
    path: "/api/health",
    method: "GET",
    price: 0,               // free endpoint
    handler: "healthCheck",
    tier: "free",
    description: "Health check",
  },
];`}
            />
            <p>
              Pricing is in <strong>satoshis</strong> (1 BSV = 100,000,000 satoshis). At typical BSV prices,
              1,000 sats ≈ $0.06 USD. The dashboard and discovery manifest update automatically
              from this config.
            </p>
          </StepCard>

          <StepCard step={3} title="Write Your Handlers" icon={Code2}>
            <p>
              Open <code className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">server/services/example.ts</code> and
              add your business logic. Each handler is a standard Express request handler — the auth and payment
              middleware run before your code, so by the time your handler executes, the caller has already been
              authenticated and paid:
            </p>
            <CodeBlock
              label="handler"
              code={`// server/services/example.ts
import type { Request, Response } from "express";

export const handlers: Record<string, any> = {
  generateSummary: async (req: Request, res: Response) => {
    const { text, maxLength } = req.body;

    // Your business logic here
    const summary = await callYourAIService(text, maxLength);

    res.json({
      success: true,
      data: { summary, wordCount: summary.split(" ").length },
    });
  },

  healthCheck: (_req: Request, res: Response) => {
    res.json({ status: "ok", timestamp: Date.now() });
  },
};`}
            />
            <p>
              The handler name in <code className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">config.ts</code> must
              match the key in the <code className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">handlers</code> object.
              The middleware chain is: <strong>Auth → Payment → Your Handler</strong>.
            </p>
          </StepCard>

          <StepCard step={4} title="Test in Demo Mode" icon={TestTube}>
            <p>
              With no <code className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">SERVER_PRIVATE_KEY</code> set,
              the middleware is bypassed and all endpoints work without authentication or payment. Use this to verify
              your business logic:
            </p>
            <CodeBlock
              label="curl-demo"
              code={`# Test your endpoint in demo mode (no payment required)
curl -X POST https://your-app.replit.app/api/generate-summary \\
  -H "Content-Type: application/json" \\
  -d '{"text": "Your document text here", "maxLength": 100}'`}
            />
            <p>
              You can also test the discovery endpoint that AI agents use to find your API:
            </p>
            <CodeBlock
              label="curl-discovery"
              code={`# Check your discovery manifest
curl https://your-app.replit.app/.well-known/x402-info | jq .`}
            />
            <p>
              The discovery manifest at <code className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">/.well-known/x402-info</code> is
              auto-generated from your config. AI agents use this to understand what endpoints are available,
              what they cost, and how to call them.
            </p>
          </StepCard>

          <StepCard step={5} title="Enable Payments & Deploy" icon={Rocket}>
            <p>
              When you're ready to go live with real payments:
            </p>
            <ol className="list-decimal list-inside space-y-2 pl-1">
              <li>Set <code className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">SERVER_PRIVATE_KEY</code> in your Replit Secrets</li>
              <li>Publish your app to get a permanent URL</li>
              <li>Your endpoints now require BSV auth headers and payment transactions</li>
            </ol>
            <p className="pt-2">
              The payment flow works like this:
            </p>
            <div className="bg-muted/50 border border-border rounded-lg p-4 space-y-2 font-mono text-xs">
              <div className="flex items-center gap-2">
                <ChevronRight className="w-3 h-3 text-primary" />
                <span>Client discovers API via <span className="text-primary">GET /.well-known/x402-info</span></span>
              </div>
              <div className="flex items-center gap-2">
                <ChevronRight className="w-3 h-3 text-primary" />
                <span>Client signs request with BSV key <span className="text-muted-foreground">(BRC-103/104)</span></span>
              </div>
              <div className="flex items-center gap-2">
                <ChevronRight className="w-3 h-3 text-primary" />
                <span>Client creates BSV tx for the endpoint price <span className="text-muted-foreground">(BRC-29/105)</span></span>
              </div>
              <div className="flex items-center gap-2">
                <ChevronRight className="w-3 h-3 text-primary" />
                <span>Server verifies auth + payment, runs your handler</span>
              </div>
              <div className="flex items-center gap-2">
                <ChevronRight className="w-3 h-3 text-primary" />
                <span>If handler fails, payment is <span className="text-emerald-400">automatically refunded</span></span>
              </div>
            </div>
          </StepCard>

          <StepCard step={6} title="Calling Your Paid API from Another App" icon={Terminal}>
            <p>
              To call your paid endpoints from another application, that app needs a BSV wallet to sign requests
              and create payment transactions. Here's the pattern using the BSV SDK:
            </p>
            <CodeBlock
              label="client-code"
              code={`import { ProtoWallet, PrivateKey } from '@bsv/sdk'

// 1. Create a wallet for the client
const clientKey = PrivateKey.fromHex('your-client-private-key')
const wallet = new ProtoWallet(clientKey)

// 2. Discover the API
const discovery = await fetch(
  'https://your-api.replit.app/.well-known/x402-info'
).then(r => r.json())

// 3. Find your endpoint and its price
const endpoint = discovery.endpoints
  .find(e => e.path === '/api/generate-summary')
console.log(\`Price: \${endpoint.payment.satoshis} sats\`)

// 4. Make authenticated + paid request
//    (The BSV auth and payment headers are
//     handled by the middleware SDKs —
//     see @bsv/auth-fetch for a drop-in fetch wrapper)`}
            />
            <p>
              For a complete client-side integration, check out
              the <code className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">@bsv/auth-fetch</code> package,
              which wraps the standard <code className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">fetch</code> API
              and handles BRC-103/104 signing and BRC-29/105 payment automatically.
            </p>
          </StepCard>

        </div>

        <Separator />

        <div className="flex items-center justify-between py-4">
          <Link href="/">
            <Button variant="outline" className="gap-2" data-testid="button-back-dashboard">
              <ArrowLeft className="w-4 h-4" />
              Back to Dashboard
            </Button>
          </Link>
        </div>
      </main>
    </div>
  );
}
