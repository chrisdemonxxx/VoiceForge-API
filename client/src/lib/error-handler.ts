import { useToast } from "@/hooks/use-toast";

export interface ApiError extends Error {
  status?: number;
  code?: string;
  details?: any;
}

/**
 * Standardized error handler for API errors
 */
export function handleApiError(error: unknown, toast: ReturnType<typeof useToast>['toast']) {
  let errorMessage = "An unexpected error occurred";
  let errorTitle = "Error";
  
  if (error instanceof Error) {
    errorMessage = error.message;
    
    // Check for specific error types
    if (error.message.includes("401") || error.message.includes("Unauthorized")) {
      errorTitle = "Authentication Required";
      errorMessage = "Please create an API key to continue";
    } else if (error.message.includes("403") || error.message.includes("Forbidden")) {
      errorTitle = "Access Denied";
      errorMessage = "You don't have permission to perform this action";
    } else if (error.message.includes("404") || error.message.includes("Not Found")) {
      errorTitle = "Not Found";
      errorMessage = "The requested resource was not found";
    } else if (error.message.includes("429") || error.message.includes("Rate Limit")) {
      errorTitle = "Rate Limit Exceeded";
      errorMessage = "Too many requests. Please try again later";
    } else if (error.message.includes("500") || error.message.includes("Server Error")) {
      errorTitle = "Server Error";
      errorMessage = "An error occurred on the server. Please try again later";
    } else if (error.message.includes("503") || error.message.includes("Service Unavailable")) {
      errorTitle = "Service Unavailable";
      errorMessage = "The service is temporarily unavailable. Please try again later";
    } else if (error.message.includes("Network") || error.message.includes("Failed to fetch")) {
      errorTitle = "Network Error";
      errorMessage = "Unable to connect to the server. Please check your internet connection";
    }
  }
  
  toast({
    variant: "destructive",
    title: errorTitle,
    description: errorMessage,
  });
  
  // Log error for debugging
  console.error("[API Error]:", error);
}

/**
 * Standardized error handler that returns a user-friendly message
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return "An unexpected error occurred";
}

/**
 * Check if error is an API key error
 */
export function isApiKeyError(error: unknown): boolean {
  if (error instanceof Error) {
    return error.message.includes("API key") || 
           error.message.includes("401") || 
           error.message.includes("Unauthorized");
  }
  return false;
}

/**
 * Standardized error message component props
 */
export interface ErrorMessageProps {
  error: unknown;
  title?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

