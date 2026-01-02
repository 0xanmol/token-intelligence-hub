import { config } from "@/lib/config";

const BASE_URL = "https://api.jup.ag";

/**
 * Fetch wrapper for Jupiter API.
 * Adds API key header and handles errors.
 */
export async function jupiterFetch<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      "x-api-key": config.jupiterApiKey || "",
      "Content-Type": "application/json",
      ...options?.headers,
    },
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => response.statusText);
    throw new Error(`Jupiter API error (${response.status}): ${errorText}`);
  }

  return response.json();
}
