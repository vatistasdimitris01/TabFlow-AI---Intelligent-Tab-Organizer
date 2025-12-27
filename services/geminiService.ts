
import { Tab, AIResult } from "../types";

export const categorizeTabs = async (tabs: Tab[]): Promise<AIResult | null> => {
  if (!tabs.length) return null;

  try {
    const response = await fetch('/api/categorize', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ tabs }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `Server responded with ${response.status}`);
    }

    const result = await response.json();
    return result as AIResult;
  } catch (error) {
    console.error("Categorization request failed:", error);
    throw error;
  }
};
