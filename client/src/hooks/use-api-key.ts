import { useQuery } from "@tanstack/react-query";
import type { ApiKey } from "@shared/schema";

/**
 * Hook to get the active API key
 * Returns the first active API key from the list
 */
export function useApiKey() {
  const { data: apiKeys, isLoading, error } = useQuery<ApiKey[]>({
    queryKey: ["/api/keys"],
    retry: false,
  });

  const activeApiKey = apiKeys?.find(key => key.active);

  return {
    apiKey: activeApiKey?.key,
    apiKeys,
    isLoading,
    error,
    hasApiKey: !!activeApiKey,
  };
}

/**
 * Hook to get all API keys
 */
export function useApiKeys() {
  return useQuery<ApiKey[]>({
    queryKey: ["/api/keys"],
    retry: false,
  });
}

