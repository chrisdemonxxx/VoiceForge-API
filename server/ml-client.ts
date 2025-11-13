/**
 * ML Client - Unified interface for ML operations
 * Switches between local Python Bridge and remote HF Spaces API based on environment
 */

import { pythonBridge } from "./python-bridge";
import { hfSpacesClient } from "./hf-spaces-client";

type MLClientInterface = typeof pythonBridge | typeof hfSpacesClient;

// Determine which client to use based on environment variable
const USE_HF_SPACES = process.env.USE_HF_SPACES_ML === "true" || process.env.HF_ML_API_URL !== undefined;

// Export the appropriate client
export const mlClient: MLClientInterface = USE_HF_SPACES ? hfSpacesClient : pythonBridge;

// Log which client is being used
if (USE_HF_SPACES) {
  console.log("[MLClient] Using HF Spaces API for ML operations");
} else {
  console.log("[MLClient] Using local Python Bridge for ML operations");
}
