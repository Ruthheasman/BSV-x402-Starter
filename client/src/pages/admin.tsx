import { useState, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
import {
  ArrowLeft,
  Activity,
  DollarSign,
  AlertTriangle,
  Clock,
  CheckCircle2,
  RefreshCw,
  BarChart3,
  Shield,
  Zap,
  Lock,
  LogOut,
} from "lucide-react";
import { SiBitcoin } from "react-icons/si";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { ThemeToggle } from "@/components/theme-toggle";
import { useToast } from "@/hooks/use-toast";
import { formatSats, formatUsd, satsToUsd } from "@shared/schema";
import { queryClient } from "@/lib/queryClient";

interface UsageStats {
  totalRequests: number;
  totalSatoshisEarned: number;
  totalRefundsPending: number;
  totalRefundsSatoshis: number;
  requestsToday: number;
  satoshisToday: number;
  topEndpoints: Array<{ endpoint: string; count: number; satoshis: number }>;
}

interface RequestLogEntry {
  id: number;
  endpoint: string;
  method: string;
  statusCode: number;
  satoshisPaid: number;
  senderIdentityKey: string | null;
  tier: string;
  timestamp: string;
  durationMs: number | null;
  error: string | null;
}

interface RefundEntry {
  id: number;
  endpoint: string;
  method: string;
  satoshis: number;
  senderIdentityKey: string | null;
  error: string | null;
  status: string;
  timestamp: string;
  resolvedAt: string | null;
}

const tierColors: Record<string, string> = {
  free: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  micro: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  standard: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  premium: "bg-purple-500/10 text-purple-400 border-purple-500/20",
};

function truncateKey(key: string | null): string {
  if (!key) return "—";
  if (key.length <= 16) return key;
  return `${key.slice(0, 8)}...${key.slice(-8)}`;
}

function timeAgo(timestamp: string): string {
  const diff = Date.now() - new Date(timestamp).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function adminFetchUrl(path: string, token: string | null): string {
  if (!token) return path;
  return `${path}${path.includes("?") ? "&" : "?"}token=${token}`;
}

function LoginGate({ onLogin }: { onLogin: (token: string | null) => void }) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [checked, setChecked] = useState(false);

  const checkAuth = useCallback(async () => {
    const res = await fetch("/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    const data = await res.json();
    if (!data.requiresPassword) {
      onLogin(null);
    }
    setChecked(true);
  }, [onLogin]);

  if (!checked) {
    checkAuth();
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Login failed");
        return;
      }
      onLogin(data.token);
    } catch {
      setError("Connection error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center pb-4">
          <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-3">
            <Lock className="w-6 h-6 text-primary" />
          </div>
          <CardTitle className="text-lg">Admin Login</CardTitle>
          <p className="text-sm text-muted-foreground mt-1">Enter your admin password to continue</p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              type="password"
              placeholder="Admin password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoFocus
              data-testid="input-admin-password"
            />
            {error && <p className="text-sm text-red-400" data-testid="text-login-error">{error}</p>}
            <Button type="submit" className="w-full" disabled={loading || !password} data-testid="button-admin-login">
              {loading ? "Logging in..." : "Log In"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

export default function Admin() {
  const { toast } = useToast();
  const [adminToken, setAdminToken] = useState<string | null | undefined>(undefined);

  const handleLogin = useCallback((token: string | null) => {
    setAdminToken(token);
  }, []);

  const handleLogout = useCallback(() => {
    setAdminToken(undefined);
    queryClient.removeQueries({ queryKey: ["/api/admin/stats"] });
    queryClient.removeQueries({ queryKey: ["/api/admin/requests"] });
    queryClient.removeQueries({ queryKey: ["/api/admin/refunds"] });
  }, []);

  const isAuthenticated = adminToken !== undefined;

  const statsQuery = useQuery<UsageStats>({
    queryKey: ["/api/admin/stats", adminToken],
    queryFn: async () => {
      const res = await fetch(adminFetchUrl("/api/admin/stats", adminToken ?? null));
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    enabled: isAuthenticated,
    refetchInterval: 10000,
  });

  const requestsQuery = useQuery<RequestLogEntry[]>({
    queryKey: ["/api/admin/requests", adminToken],
    queryFn: async () => {
      const res = await fetch(adminFetchUrl("/api/admin/requests", adminToken ?? null));
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    enabled: isAuthenticated,
    refetchInterval: 10000,
  });

  const refundsQuery = useQuery<RefundEntry[]>({
    queryKey: ["/api/admin/refunds", adminToken],
    queryFn: async () => {
      const res = await fetch(adminFetchUrl("/api/admin/refunds", adminToken ?? null));
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    enabled: isAuthenticated,
    refetchInterval: 10000,
  });

  const resolveRefundMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(adminFetchUrl(`/api/admin/refunds/${id}/resolve`, adminToken ?? null), { method: "POST" });
      if (!res.ok) throw new Error(await res.text());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/refunds"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/stats"] });
      toast({ title: "Refund marked as resolved" });
    },
    onError: (err: any) => {
      toast({ title: "Failed to resolve refund", description: err.message, variant: "destructive" });
    },
  });

  if (!isAuthenticated) {
    return <LoginGate onLogin={handleLogin} />;
  }

  const stats = statsQuery.data;
  const requests = requestsQuery.data || [];
  const refunds = refundsQuery.data || [];
  const pendingRefunds = refunds.filter((r) => r.status === "pending");

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 backdrop-blur-md bg-background/80 border-b border-border">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link href="/">
              <Button variant="ghost" size="sm" className="gap-2" data-testid="button-back-home">
                <ArrowLeft className="w-4 h-4" />
                <SiBitcoin className="w-4 h-4 text-primary" />
                <span className="font-semibold text-sm">BSV x402 Starter</span>
              </Button>
            </Link>
            <Separator orientation="vertical" className="h-5" />
            <Badge variant="outline" className="text-xs gap-1" data-testid="badge-admin">
              <Shield className="w-3 h-3" />
              Admin
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                queryClient.invalidateQueries({ queryKey: ["/api/admin/stats"] });
                queryClient.invalidateQueries({ queryKey: ["/api/admin/requests"] });
                queryClient.invalidateQueries({ queryKey: ["/api/admin/refunds"] });
              }}
              data-testid="button-refresh"
            >
              <RefreshCw className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLogout}
              data-testid="button-logout"
            >
              <LogOut className="w-4 h-4" />
            </Button>
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8 space-y-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight" data-testid="text-admin-title">
            API Usage & Refunds
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Track endpoint usage, payments received, and manage pending refunds.
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card data-testid="card-stat-total-requests">
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 text-muted-foreground text-xs font-medium mb-1">
                <Activity className="w-3.5 h-3.5" />
                Total Requests
              </div>
              <div className="text-2xl font-bold">{stats?.totalRequests ?? "—"}</div>
              <div className="text-xs text-muted-foreground mt-1">
                {stats?.requestsToday ?? 0} today
              </div>
            </CardContent>
          </Card>

          <Card data-testid="card-stat-total-earned">
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 text-muted-foreground text-xs font-medium mb-1">
                <DollarSign className="w-3.5 h-3.5" />
                Total Earned
              </div>
              <div className="text-2xl font-bold">
                {stats ? formatSats(stats.totalSatoshisEarned) : "—"}
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                {stats ? formatUsd(satsToUsd(stats.satoshisToday)) : "$0"} today
              </div>
            </CardContent>
          </Card>

          <Card data-testid="card-stat-pending-refunds">
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 text-muted-foreground text-xs font-medium mb-1">
                <AlertTriangle className="w-3.5 h-3.5" />
                Pending Refunds
              </div>
              <div className="text-2xl font-bold text-amber-400">
                {stats?.totalRefundsPending ?? 0}
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                {stats ? formatSats(stats.totalRefundsSatoshis) : "0 sats"} owed
              </div>
            </CardContent>
          </Card>

          <Card data-testid="card-stat-today">
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 text-muted-foreground text-xs font-medium mb-1">
                <Zap className="w-3.5 h-3.5" />
                Today's Revenue
              </div>
              <div className="text-2xl font-bold">
                {stats ? formatSats(stats.satoshisToday) : "—"}
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                {stats ? formatUsd(satsToUsd(stats.satoshisToday)) : "$0"} USD
              </div>
            </CardContent>
          </Card>
        </div>

        {stats && stats.topEndpoints.length > 0 && (
          <Card data-testid="card-top-endpoints">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-primary" />
                Top Endpoints
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {stats.topEndpoints.map((ep) => (
                  <div key={ep.endpoint} className="flex items-center justify-between text-sm" data-testid={`row-endpoint-${ep.endpoint}`}>
                    <code className="font-mono text-xs bg-muted px-2 py-1 rounded">{ep.endpoint}</code>
                    <div className="flex items-center gap-4 text-muted-foreground text-xs">
                      <span>{ep.count} requests</span>
                      <span>{formatSats(ep.satoshis)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {pendingRefunds.length > 0 && (
          <Card className="border-amber-500/30" data-testid="card-pending-refunds">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2 text-amber-400">
                <AlertTriangle className="w-4 h-4" />
                Pending Refunds ({pendingRefunds.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-xs text-muted-foreground border-b border-border">
                      <th className="text-left py-2 pr-4">Time</th>
                      <th className="text-left py-2 pr-4">Endpoint</th>
                      <th className="text-left py-2 pr-4">Amount</th>
                      <th className="text-left py-2 pr-4">Sender</th>
                      <th className="text-left py-2 pr-4">Error</th>
                      <th className="text-right py-2">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pendingRefunds.map((refund) => (
                      <tr key={refund.id} className="border-b border-border/50" data-testid={`row-refund-${refund.id}`}>
                        <td className="py-2 pr-4 text-muted-foreground text-xs">{timeAgo(refund.timestamp)}</td>
                        <td className="py-2 pr-4">
                          <code className="font-mono text-xs">{refund.method} {refund.endpoint}</code>
                        </td>
                        <td className="py-2 pr-4 font-medium text-amber-400">{formatSats(refund.satoshis)}</td>
                        <td className="py-2 pr-4 font-mono text-xs text-muted-foreground">{truncateKey(refund.senderIdentityKey)}</td>
                        <td className="py-2 pr-4 text-xs text-red-400 max-w-[200px] truncate">{refund.error || "—"}</td>
                        <td className="py-2 text-right">
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs gap-1"
                            onClick={() => resolveRefundMutation.mutate(refund.id)}
                            disabled={resolveRefundMutation.isPending}
                            data-testid={`button-resolve-${refund.id}`}
                          >
                            <CheckCircle2 className="w-3 h-3" />
                            Resolve
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}

        <Card data-testid="card-recent-requests">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Clock className="w-4 h-4 text-primary" />
              Recent Requests ({requests.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {requests.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8" data-testid="text-no-requests">
                No requests logged yet. API requests will appear here.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-xs text-muted-foreground border-b border-border">
                      <th className="text-left py-2 pr-4">Time</th>
                      <th className="text-left py-2 pr-4">Endpoint</th>
                      <th className="text-left py-2 pr-4">Status</th>
                      <th className="text-left py-2 pr-4">Tier</th>
                      <th className="text-left py-2 pr-4">Payment</th>
                      <th className="text-left py-2 pr-4">Duration</th>
                      <th className="text-left py-2">Caller</th>
                    </tr>
                  </thead>
                  <tbody>
                    {requests.map((req) => (
                      <tr key={req.id} className="border-b border-border/50" data-testid={`row-request-${req.id}`}>
                        <td className="py-2 pr-4 text-muted-foreground text-xs">{timeAgo(req.timestamp)}</td>
                        <td className="py-2 pr-4">
                          <code className="font-mono text-xs">{req.method} {req.endpoint}</code>
                        </td>
                        <td className="py-2 pr-4">
                          <Badge
                            variant="outline"
                            className={`text-[10px] ${req.statusCode < 400 ? "text-emerald-400 border-emerald-500/20" : "text-red-400 border-red-500/20"}`}
                          >
                            {req.statusCode}
                          </Badge>
                        </td>
                        <td className="py-2 pr-4">
                          <Badge variant="outline" className={`text-[10px] ${tierColors[req.tier] || ""}`}>
                            {req.tier}
                          </Badge>
                        </td>
                        <td className="py-2 pr-4 text-xs">
                          {req.satoshisPaid > 0 ? formatSats(req.satoshisPaid) : "—"}
                        </td>
                        <td className="py-2 pr-4 text-xs text-muted-foreground">
                          {req.durationMs ? `${req.durationMs}ms` : "—"}
                        </td>
                        <td className="py-2 font-mono text-xs text-muted-foreground">
                          {truncateKey(req.senderIdentityKey)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

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
