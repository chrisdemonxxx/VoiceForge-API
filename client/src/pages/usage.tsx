import { useQuery } from "@tanstack/react-query";
import { BarChart3, TrendingUp, CreditCard, Activity } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { UsageStats, ApiKey } from "@shared/schema";

export default function Usage() {
  // Fetch API keys first
  const { data: apiKeys = [] } = useQuery<ApiKey[]>({
    queryKey: ["/api/keys"],
    retry: false,
  });

  // Helper to get auth headers
  const getAuthHeaders = () => {
    const activeKey = apiKeys.find(k => k.active);
    if (!activeKey) {
      return null;
    }
    return {
      "Authorization": `Bearer ${activeKey.key}`,
    };
  };

  // Helper to get API base URL
  const getApiBaseUrl = () => {
    if (import.meta.env.VITE_API_URL) {
      return import.meta.env.VITE_API_URL;
    }
    return "";
  };

  const { data: stats, isLoading } = useQuery<UsageStats>({
    queryKey: ["/api/usage", apiKeys.length],
    queryFn: async () => {
      const authHeaders = getAuthHeaders();
      if (!authHeaders) {
        // Return default empty stats if no active key
        return {
          totalRequests: 0,
          successRate: 0,
          avgLatency: 0,
          requestsToday: 0,
          ttsRequests: 0,
          sttRequests: 0,
          vadRequests: 0,
          vllmRequests: 0,
        };
      }
      const apiBase = getApiBaseUrl();
      const response = await fetch(`${apiBase}/api/usage`, {
        headers: authHeaders,
      });
      if (!response.ok) {
        if (response.status === 401) {
          throw new Error("Unauthorized - API key may be invalid");
        }
        throw new Error("Failed to fetch usage stats");
      }
      return response.json();
    },
    enabled: apiKeys.some(k => k.active), // Only fetch when there's an active key
    retry: false,
  });

  return (
    <div className="flex-1 overflow-auto">
      <div className="max-w-7xl mx-auto p-8 space-y-8">
        {/* Header */}
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <BarChart3 className="h-6 w-6 text-primary" />
            </div>
            <h1 className="text-3xl font-bold text-foreground">Usage & Billing</h1>
          </div>
          <p className="text-muted-foreground mt-2">
            Monitor your API usage and manage billing
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {isLoading ? (
            <>
              {[1, 2, 3, 4].map((i) => (
                <Card key={i}>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-4 w-4" />
                  </CardHeader>
                  <CardContent>
                    <Skeleton className="h-8 w-20 mb-2" />
                    <Skeleton className="h-3 w-32" />
                  </CardContent>
                </Card>
              ))}
            </>
          ) : stats ? (
            <>
              <Card data-testid="card-stat-requests">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Requests Today</CardTitle>
                  <Activity className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.requestsToday.toLocaleString()}</div>
                  <p className="text-xs text-muted-foreground mt-1">
                    +12% from yesterday
                  </p>
                </CardContent>
              </Card>

              <Card data-testid="card-stat-total">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Requests</CardTitle>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.totalRequests.toLocaleString()}</div>
                  <p className="text-xs text-muted-foreground mt-1">
                    All time
                  </p>
                </CardContent>
              </Card>

              <Card data-testid="card-stat-cost">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Estimated Cost</CardTitle>
                  <CreditCard className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">$24.50</div>
                  <p className="text-xs text-muted-foreground mt-1">
                    This month
                  </p>
                </CardContent>
              </Card>

              <Card data-testid="card-stat-success">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
                  <Activity className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.successRate}%</div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Excellent performance
                  </p>
                </CardContent>
              </Card>
            </>
          ) : null}
        </div>

        {/* Usage Breakdown */}
        {stats && (
          <Card>
            <CardHeader>
              <CardTitle>Usage Breakdown</CardTitle>
              <CardDescription>
                API usage by service type
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between mb-2">
                    <span className="text-sm font-medium">Text-to-Speech</span>
                    <span className="text-sm text-muted-foreground">
                      {stats.ttsRequests.toLocaleString()} requests
                    </span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary transition-all duration-500"
                      style={{
                        width: `${(stats.ttsRequests / stats.totalRequests) * 100}%`,
                      }}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between mb-2">
                    <span className="text-sm font-medium">Speech-to-Text</span>
                    <span className="text-sm text-muted-foreground">
                      {stats.sttRequests.toLocaleString()} requests
                    </span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-500 transition-all duration-500"
                      style={{
                        width: `${(stats.sttRequests / stats.totalRequests) * 100}%`,
                      }}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between mb-2">
                    <span className="text-sm font-medium">Voice Activity Detection</span>
                    <span className="text-sm text-muted-foreground">
                      {stats.vadRequests.toLocaleString()} requests
                    </span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-green-500 transition-all duration-500"
                      style={{
                        width: `${(stats.vadRequests / stats.totalRequests) * 100}%`,
                      }}
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
