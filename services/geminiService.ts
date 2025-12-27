
import { Tab, AIResult } from "../types";

export interface StreamUpdate {
  status: 'initializing' | 'analyzing' | 'retry' | 'success' | 'error';
  message?: string;
  data?: AIResult;
  sources?: any[];
}

export const categorizeTabs = async (
  tabs: Tab[], 
  onUpdate: (update: StreamUpdate) => void
): Promise<void> => {
  if (!tabs.length) return;

  try {
    const response = await fetch('/api/categorize', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tabs }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Server error (${response.status}): ${errorText}`);
    }

    const reader = response.body?.getReader();
    if (!reader) throw new Error("Stream reader not available");

    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (!line.trim()) continue;
        try {
          const update: StreamUpdate = JSON.parse(line);
          onUpdate(update);
        } catch (e) {
          console.error("NDJSON parse error", e);
        }
      }
    }
  } catch (error) {
    console.error("Categorization failed:", error);
    onUpdate({ 
      status: 'error', 
      message: error instanceof Error ? error.message : String(error) 
    });
  }
};
