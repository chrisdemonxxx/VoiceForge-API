import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

// Get API base URL from environment or use relative path
const getApiBaseUrl = () => {
  // In production, use Vercel proxy (relative URLs work with vercel.json rewrites)
  // For direct backend access, use VITE_API_URL env var
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }
  // Default to relative URLs (works with Vercel proxy)
  return "";
};

// Get active API key from localStorage or fetch from API
async function getActiveApiKey(): Promise<string | null> {
  try {
    // Try to get from API keys endpoint
    const apiBase = getApiBaseUrl();
    const response = await fetch(`${apiBase}/api/keys`);
    if (response.ok) {
      const keys = await response.json();
      const activeKey = keys.find((k: any) => k.active);
      if (activeKey) {
        return activeKey.key;
      }
    }
  } catch (error) {
    console.warn("[queryClient] Failed to fetch API keys:", error);
  }
  return null;
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
  includeAuth: boolean = true,
): Promise<Response> {
  const apiBase = getApiBaseUrl();
  const fullUrl = url.startsWith("http") ? url : apiBase + url;
  
  const headers: Record<string, string> = {};
  if (data) {
    headers["Content-Type"] = "application/json";
  }
  
  // Add Authorization header if needed
  if (includeAuth) {
    const apiKey = await getActiveApiKey();
    if (apiKey) {
      headers["Authorization"] = `Bearer ${apiKey}`;
    }
  }
  
  const res = await fetch(fullUrl, {
    method,
    headers,
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
  requireAuth?: boolean;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior, requireAuth = false }) =>
  async ({ queryKey }) => {
    const apiBase = getApiBaseUrl();
    const url = apiBase + queryKey.join("/");
    
    const headers: Record<string, string> = {};
    
    // Add Authorization header if required
    if (requireAuth) {
      const apiKey = await getActiveApiKey();
      if (apiKey) {
        headers["Authorization"] = `Bearer ${apiKey}`;
      }
    }
    
    const res = await fetch(url, {
      credentials: "include",
      headers,
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
