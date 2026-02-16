import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import {
  Shield,
  Zap,
  Globe,
  ArrowRight,
  CheckCircle2,
  Copy,
  ExternalLink,
  Activity,
  DollarSign,
  Lock,
  Unlock,
  Server,
  ChevronRight,
  Terminal,
  RefreshCw,
  CircleDot,
  BookOpen,
} from "lucide-react";
import { SiBitcoin } from "react-icons/si";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ThemeToggle } from "@/components/theme-toggle";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import type { ServerStatus, EndpointConfig } from "@shared/schema";
import { formatSats, formatUsd, satsToUsd } from "@shared/schema";

function copyToClipboard(text: string, toast: ReturnType<typeof useToast>["toast"]) {
  navigator.clipboard.writeText(text);
  toast({ title: "Copied to clipboard" });
}

const tierColors: Record<string, string> = {
  free: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  micro: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  standard: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  premium: "bg-purple-500/10 text-purple-400 border-purple-500/20",
};

const tierLabels: Record<string, string> = {
  free: "Free",
  micro: "Micro",
  standard: "Standard",
  premium: "Premium",
};

const methodColors: Record<string, string> = {
  GET: "bg-emerald-500/15 text-emerald-400",
  POST: "bg-blue-500/15 text-blue-400",
  PUT: "bg-amber-500/15 text-amber-400",
  DELETE: "bg-red-500/15 text-red-400",
};

function StatusIndicator({ status }: { status: string }) {
  return (
    <div className="flex items-center gap-2">
      <div className={`w-2 h-2 rounded-full ${status === "online" ? "bg-emerald-400 animate-pulse" : "bg-red-400"}`} />
      <span className="text-sm font-medium text-muted-foreground capitalize">{status}</span>
    </div>
  );
}

function HeroSection() {
  return (
    <section className="relative py-20 px-6 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-primary/3" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-primary/5 rounded-full blur-3xl" />
      <div className="relative max-w-5xl mx-auto text-center">
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 mb-6">
            <SiBitcoin className="w-3.5 h-3.5 text-primary" />
            <span className="text-xs font-medium text-primary" data-testid="text-protocol-badge">BSV x402 Protocol</span>
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight mb-4" data-testid="text-hero-title">
            Ship a <span className="text-primary">Paid API</span> in
            <br />Under an Hour
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-8" data-testid="text-hero-subtitle">
            Fork it, set your private key, define your endpoints and prices, deploy.
            AI agents discover, authenticate, pay, and consume your API -- all autonomously.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Button size="lg" data-testid="button-get-started">
              <Zap className="w-4 h-4 mr-2" />
              Get Started
            </Button>
            <Button size="lg" variant="outline" data-testid="button-view-discovery">
              <Globe className="w-4 h-4 mr-2" />
              View Discovery Endpoint
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}

function StatsBar({ data }: { data: ServerStatus | undefined }) {
  const stats = [
    { label: "Status", value: data?.status || "loading", icon: Activity },
    { label: "Endpoints", value: data?.totalEndpoints?.toString() || "--", icon: Server },
    { label: "Paid", value: data?.paidEndpoints?.toString() || "--", icon: DollarSign },
    { label: "Free", value: data?.freeEndpoints?.toString() || "--", icon: Unlock },
  ];

  return (
    <section className="px-6 -mt-4">
      <div className="max-w-5xl mx-auto">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {stats.map((stat) => (
            <Card key={stat.label}>
              <CardContent className="flex items-center gap-3 py-4 px-4">
                <div className="p-2 rounded-md bg-primary/10">
                  <stat.icon className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">{stat.label}</div>
                  <div className="text-sm font-semibold" data-testid={`text-stat-${stat.label.toLowerCase()}`}>
                    {stat.label === "Status" ? (
                      <StatusIndicator status={stat.value} />
                    ) : (
                      stat.value
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}

function EndpointCard({ endpoint, index }: { endpoint: EndpointConfig; index: number }) {
  const { toast } = useToast();
  const [expanded, setExpanded] = useState(false);
  const usd = satsToUsd(endpoint.price);

  return (
    <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
      <Card
        className="group cursor-pointer transition-all duration-200"
        onClick={() => setExpanded(!expanded)}
        data-testid={`card-endpoint-${index}`}
      >
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-2 mb-3">
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`px-2 py-0.5 rounded text-xs font-mono font-bold ${methodColors[endpoint.method]}`}>
                {endpoint.method}
              </span>
              <code className="text-sm font-mono text-foreground">{endpoint.path}</code>
            </div>
            <Badge variant="outline" className={`shrink-0 text-xs ${tierColors[endpoint.tier]}`}>
              {tierLabels[endpoint.tier]}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mb-3">{endpoint.description}</p>
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-3">
              {endpoint.price > 0 ? (
                <>
                  <div className="flex items-center gap-1">
                    <SiBitcoin className="w-3 h-3 text-primary" />
                    <span className="text-sm font-semibold text-primary">{formatSats(endpoint.price)}</span>
                  </div>
                  <span className="text-xs text-muted-foreground">~{formatUsd(usd)}</span>
                </>
              ) : (
                <div className="flex items-center gap-1">
                  <Unlock className="w-3 h-3 text-emerald-400" />
                  <span className="text-sm font-semibold text-emerald-400">Free</span>
                </div>
              )}
            </div>
            <ChevronRight className={`w-4 h-4 text-muted-foreground transition-transform ${expanded ? "rotate-90" : ""}`} />
          </div>

          {expanded && endpoint.accepts && (
            <div className="mt-4 pt-4 border-t border-border">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {endpoint.accepts && (
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">Accepts</p>
                    <div className="bg-background rounded-md p-3 font-mono text-xs space-y-1">
                      {Object.entries(endpoint.accepts.body).map(([key, val]) => (
                        <div key={key}>
                          <span className="text-primary">{key}</span>
                          <span className="text-muted-foreground">: {val}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {endpoint.returns && (
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">Returns</p>
                    <div className="bg-background rounded-md p-3 font-mono text-xs space-y-1">
                      {Object.entries(endpoint.returns.body).map(([key, val]) => (
                        <div key={key}>
                          <span className="text-primary">{key}</span>
                          <span className="text-muted-foreground">: {val}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              <div className="mt-3 flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={(e) => {
                    e.stopPropagation();
                    copyToClipboard(`curl -X ${endpoint.method} ${window.location.origin}${endpoint.path}`, toast);
                  }}
                  data-testid={`button-copy-curl-${index}`}
                >
                  <Copy className="w-3 h-3 mr-1" />
                  Copy cURL
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function EndpointsSection({ endpoints }: { endpoints: EndpointConfig[] }) {
  const tiers = ["free", "micro", "standard", "premium"] as const;
  const [activeFilter, setActiveFilter] = useState<string>("all");

  const filtered = activeFilter === "all" ? endpoints : endpoints.filter((e) => e.tier === activeFilter);

  return (
    <section className="px-6 py-12">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between gap-4 mb-6 flex-wrap">
          <div>
            <h2 className="text-2xl font-bold" data-testid="text-endpoints-title">API Endpoints</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Config-driven pricing. Define once, serve everywhere.
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Badge
              variant={activeFilter === "all" ? "default" : "outline"}
              className="cursor-pointer"
              onClick={() => setActiveFilter("all")}
              data-testid="button-filter-all"
            >
              All
            </Badge>
            {tiers.map((tier) => (
              <Badge
                key={tier}
                variant={activeFilter === tier ? "default" : "outline"}
                className={`cursor-pointer ${activeFilter !== tier ? tierColors[tier] : ""}`}
                onClick={() => setActiveFilter(tier)}
                data-testid={`button-filter-${tier}`}
              >
                {tierLabels[tier]}
              </Badge>
            ))}
          </div>
        </div>
        <div className="grid gap-3">
          {filtered.map((endpoint, i) => (
            <EndpointCard key={endpoint.path} endpoint={endpoint} index={i} />
          ))}
          {filtered.length === 0 && (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-muted-foreground">No endpoints in this tier.</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </section>
  );
}

function PaymentFlowSection() {
  const steps = [
    {
      num: "01",
      title: "Discovery",
      desc: "Agent hits /.well-known/x402-info and gets back everything it needs: endpoints, pricing, capabilities.",
      icon: Globe,
      code: "GET /.well-known/x402-info",
    },
    {
      num: "02",
      title: "Authentication",
      desc: "Mutual cryptographic authentication via BRC-103/104. No passwords, no API keys. Just math.",
      icon: Shield,
      code: "BRC-103 Handshake",
    },
    {
      num: "03",
      title: "402 Payment Required",
      desc: "Server returns HTTP 402 with the price in satoshis and a unique derivation prefix for this request.",
      icon: DollarSign,
      code: "HTTP 402 → x-bsv-payment-satoshis-required: 1000",
    },
    {
      num: "04",
      title: "Pay & Retry",
      desc: "Client constructs a BSV transaction, attaches it to the header, and retries. Server verifies and serves.",
      icon: CheckCircle2,
      code: "POST /api/endpoint → x-bsv-payment: {tx} → 200 OK",
    },
  ];

  return (
    <section className="px-6 py-12 bg-card/30">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-10">
          <h2 className="text-2xl font-bold mb-2" data-testid="text-payment-flow-title">How Payment Works</h2>
          <p className="text-sm text-muted-foreground max-w-lg mx-auto">
            The 4-step flow that lets AI agents discover, authenticate, pay for, and consume your API autonomously.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {steps.map((step, i) => (
            <div key={step.num} className="animate-in fade-in slide-in-from-bottom-3 duration-400">
              <Card className="h-full relative">
                <CardContent className="p-5">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="p-2 rounded-md bg-primary/10">
                      <step.icon className="w-4 h-4 text-primary" />
                    </div>
                    <span className="text-xs font-mono text-primary font-bold">{step.num}</span>
                  </div>
                  <h3 className="text-sm font-semibold mb-2">{step.title}</h3>
                  <p className="text-xs text-muted-foreground mb-3 leading-relaxed">{step.desc}</p>
                  <code className="block text-[10px] font-mono text-primary/80 bg-primary/5 rounded px-2 py-1.5 break-all">
                    {step.code}
                  </code>
                </CardContent>
                {i < steps.length - 1 && (
                  <div className="hidden lg:flex absolute -right-3 top-1/2 -translate-y-1/2 z-10">
                    <ArrowRight className="w-4 h-4 text-primary/40" />
                  </div>
                )}
              </Card>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function ArchitectureSection() {
  return (
    <section className="px-6 py-12">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-10">
          <h2 className="text-2xl font-bold mb-2" data-testid="text-architecture-title">Architecture</h2>
          <p className="text-sm text-muted-foreground max-w-lg mx-auto">
            Express middleware chain: Auth first, then Payment, then your business logic.
          </p>
        </div>
        <Card>
          <CardContent className="p-6">
            <div className="font-mono text-xs sm:text-sm space-y-4">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Terminal className="w-4 h-4" />
                <span>Express Server</span>
              </div>
              <div className="pl-6 space-y-3">
                <div className="flex items-center gap-3 p-3 rounded-md bg-emerald-500/5 border border-emerald-500/10">
                  <Shield className="w-4 h-4 text-emerald-400 shrink-0" />
                  <div>
                    <span className="text-emerald-400 font-semibold">Auth Middleware</span>
                    <span className="text-muted-foreground ml-2">BRC-103/104 Mutual Authentication</span>
                  </div>
                </div>
                <div className="flex justify-center">
                  <ArrowRight className="w-4 h-4 text-muted-foreground rotate-90" />
                </div>
                <div className="flex items-center gap-3 p-3 rounded-md bg-amber-500/5 border border-amber-500/10">
                  <DollarSign className="w-4 h-4 text-amber-400 shrink-0" />
                  <div>
                    <span className="text-amber-400 font-semibold">Payment Middleware</span>
                    <span className="text-muted-foreground ml-2">BRC-29/105 HTTP 402 Micropayments</span>
                  </div>
                </div>
                <div className="flex justify-center">
                  <ArrowRight className="w-4 h-4 text-muted-foreground rotate-90" />
                </div>
                <div className="flex items-center gap-3 p-3 rounded-md bg-blue-500/5 border border-blue-500/10">
                  <Server className="w-4 h-4 text-blue-400 shrink-0" />
                  <div>
                    <span className="text-blue-400 font-semibold">Route Handlers</span>
                    <span className="text-muted-foreground ml-2">Your business logic</span>
                  </div>
                </div>
              </div>
              <Separator className="my-4" />
              <div className="flex items-center gap-3 p-3 rounded-md bg-primary/5 border border-primary/10">
                <Globe className="w-4 h-4 text-primary shrink-0" />
                <div>
                  <span className="text-primary font-semibold">/.well-known/x402-info</span>
                  <span className="text-muted-foreground ml-2">Agent discovery manifest</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}

function QuickstartSection() {
  const { toast } = useToast();
  const steps = [
    {
      step: 1,
      title: "Fork this template",
      code: "Click 'Fork' on Replit",
    },
    {
      step: 2,
      title: "Set your private key",
      code: "SERVER_PRIVATE_KEY=your_hex_private_key",
    },
    {
      step: 3,
      title: "Define your endpoints",
      code: `// server/config.ts
export const endpoints = [
  {
    path: '/api/your-endpoint',
    method: 'POST',
    price: 1000,  // ~$0.06
    description: 'Your API description',
    handler: 'yourHandler',
  },
];`,
    },
    {
      step: 4,
      title: "Deploy",
      code: "npm run dev  # That's it. You're live.",
    },
  ];

  return (
    <section className="px-6 py-12 bg-card/30">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-10">
          <h2 className="text-2xl font-bold mb-2" data-testid="text-quickstart-title">Quick Start</h2>
          <p className="text-sm text-muted-foreground">Four steps. Under an hour. Production-ready.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {steps.map((s, i) => (
            <div key={s.step} className="animate-in fade-in slide-in-from-bottom-2 duration-300">
              <Card className="h-full">
                <CardContent className="p-5">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                      {s.step}
                    </div>
                    <h3 className="text-sm font-semibold">{s.title}</h3>
                  </div>
                  <div className="relative group">
                    <pre className="text-xs font-mono bg-background rounded-md p-3 overflow-x-auto text-muted-foreground whitespace-pre-wrap">
                      {s.code}
                    </pre>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => copyToClipboard(s.code, toast)}
                      data-testid={`button-copy-step-${s.step}`}
                    >
                      <Copy className="w-3 h-3" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function FeaturesSection() {
  const features = [
    {
      icon: SiBitcoin,
      title: "Sub-cent Pricing",
      desc: "Charge fractions of a cent per request. Business models impossible on Stripe work here.",
    },
    {
      icon: Shield,
      title: "Cryptographic Auth",
      desc: "BRC-103/104 mutual authentication. No passwords, no API keys, no OAuth flows.",
    },
    {
      icon: RefreshCw,
      title: "Automatic Refunds",
      desc: "If your service fails after payment, refunds happen automatically. No disputes.",
    },
    {
      icon: CircleDot,
      title: "AI-Native Discovery",
      desc: "Agents find your API via /.well-known/x402-info. Zero marketing needed.",
    },
    {
      icon: Lock,
      title: "Replay Protection",
      desc: "Nonce-based derivation prefixes prevent duplicate payments on every request.",
    },
    {
      icon: Zap,
      title: "Config-Driven",
      desc: "Define endpoints and prices in one file. The middleware handles everything else.",
    },
  ];

  return (
    <section className="px-6 py-12">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-10">
          <h2 className="text-2xl font-bold mb-2" data-testid="text-features-title">Built for the Agent Economy</h2>
          <p className="text-sm text-muted-foreground max-w-lg mx-auto">
            Everything AI agents need to discover, pay for, and consume your API.
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {features.map((f, i) => (
            <div key={f.title} className="animate-in fade-in slide-in-from-bottom-2 duration-300">
              <Card className="h-full hover-elevate">
                <CardContent className="p-5">
                  <div className="p-2 rounded-md bg-primary/10 w-fit mb-3">
                    <f.icon className="w-4 h-4 text-primary" />
                  </div>
                  <h3 className="text-sm font-semibold mb-1">{f.title}</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">{f.desc}</p>
                </CardContent>
              </Card>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function DiscoveryPreview({ data }: { data: ServerStatus | undefined }) {
  const { toast } = useToast();
  const discoveryUrl = `${window.location.origin}/.well-known/x402-info`;

  return (
    <section className="px-6 py-12 bg-card/30">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between gap-4 mb-6 flex-wrap">
          <div>
            <h2 className="text-2xl font-bold mb-1" data-testid="text-discovery-title">Discovery Manifest</h2>
            <p className="text-sm text-muted-foreground">
              What AI agents see when they hit your discovery endpoint.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => copyToClipboard(discoveryUrl, toast)}
              data-testid="button-copy-discovery-url"
            >
              <Copy className="w-3 h-3 mr-1" />
              Copy URL
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => window.open(discoveryUrl, "_blank")}
              data-testid="button-open-discovery"
            >
              <ExternalLink className="w-3 h-3 mr-1" />
              Open
            </Button>
          </div>
        </div>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <Globe className="w-4 h-4 text-primary" />
              <code className="text-xs font-mono text-muted-foreground">{discoveryUrl}</code>
            </div>
            <pre className="text-xs font-mono bg-background rounded-md p-4 overflow-x-auto max-h-80 text-muted-foreground" data-testid="text-discovery-preview">
{`{
  "service": "${data?.service || "bsv-x402-starter"}",
  "version": "${data?.version || "1.0.0"}",
  "protocol": "bsv-x402",
  "endpoints": [
    ${(data?.endpoints || []).map(e => `{
      "path": "${e.path}",
      "method": "${e.method}",
      "payment": ${e.price > 0 ? `{ "satoshis": ${e.price}, "usd_approx": ${satsToUsd(e.price)} }` : "null"},
      "description": "${e.description}"
    }`).join(",\n    ")}
  ],
  "pricing": {
    "model": "per-request",
    "currency": "satoshis"
  },
  "refunds": {
    "supported": true,
    "automatic": true
  }
}`}
            </pre>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}

function SpecsFooter() {
  const specs = [
    { name: "BRC-29", desc: "Key Derivation", url: "https://github.com/bitcoin-sv/BRCs/blob/master/payments/0029.md" },
    { name: "BRC-103", desc: "Mutual Auth", url: "https://github.com/bitcoin-sv/BRCs/blob/master/peer-to-peer/0103.md" },
    { name: "BRC-104", desc: "HTTP Transport", url: "https://github.com/bitcoin-sv/BRCs/blob/master/peer-to-peer/0104.md" },
    { name: "BRC-105", desc: "Monetization", url: "https://github.com/bitcoin-sv/BRCs/blob/master/payments/0105.md" },
  ];

  return (
    <footer className="px-6 py-10 border-t border-border">
      <div className="max-w-5xl mx-auto">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2">
            <SiBitcoin className="w-5 h-5 text-primary" />
            <span className="text-sm font-semibold">BSV x402 Starter</span>
          </div>
          <div className="flex items-center gap-4 flex-wrap justify-center">
            {specs.map((spec) => (
              <a
                key={spec.name}
                href={spec.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-muted-foreground transition-colors flex items-center gap-1 hover-elevate px-2 py-1 rounded-md"
                data-testid={`link-spec-${spec.name.toLowerCase()}`}
              >
                <span className="font-mono font-semibold text-foreground">{spec.name}</span>
                <span>{spec.desc}</span>
              </a>
            ))}
          </div>
        </div>
        <Separator className="my-6" />
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-muted-foreground">
            Powered by BSV blockchain micropayments. No middlemen. Keep 100%.
          </p>
          <div className="flex items-center gap-3">
            <a
              href="https://docs.projectbabbage.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-muted-foreground transition-colors"
              data-testid="link-docs"
            >
              Docs
            </a>
            <a
              href="https://x402agency.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-muted-foreground transition-colors"
              data-testid="link-x402agency"
            >
              x402agency
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}

export default function Dashboard() {
  const { data, isLoading } = useQuery<ServerStatus>({
    queryKey: ["/api/status"],
  });

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 backdrop-blur-md bg-background/80 border-b border-border">
        <div className="max-w-5xl mx-auto px-6 h-14 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <SiBitcoin className="w-5 h-5 text-primary" />
            <span className="font-semibold text-sm" data-testid="text-app-name">BSV x402 Starter</span>
            {data && (
              <Badge variant="outline" className="text-[10px]">v{data.version}</Badge>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Link href="/guide">
              <Button variant="ghost" size="sm" className="gap-1.5 text-xs" data-testid="link-guide">
                <BookOpen className="w-3.5 h-3.5" />
                Guide
              </Button>
            </Link>
            <StatusIndicator status={data?.status || (isLoading ? "loading" : "offline")} />
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main>
        {data && !data.walletConfigured && (
          <div className="bg-amber-500/10 border-b border-amber-500/20 px-6 py-3" data-testid="banner-demo-mode">
            <div className="max-w-5xl mx-auto flex items-center gap-2 text-sm">
              <Zap className="w-4 h-4 text-amber-400 shrink-0" />
              <span className="text-amber-700 dark:text-amber-300">
                <span className="font-semibold">Demo Mode</span> — No wallet configured. Set <code className="font-mono text-xs bg-amber-500/10 px-1 rounded">SERVER_PRIVATE_KEY</code> to enable BSV authentication and payments.
              </span>
            </div>
          </div>
        )}
        <HeroSection />
        <StatsBar data={data} />
        <EndpointsSection endpoints={data?.endpoints || []} />
        <PaymentFlowSection />
        <ArchitectureSection />
        <FeaturesSection />
        <QuickstartSection />
        <DiscoveryPreview data={data} />
      </main>

      <SpecsFooter />
    </div>
  );
}
