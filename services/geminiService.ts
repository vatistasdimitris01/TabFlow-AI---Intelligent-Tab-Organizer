
import { GoogleGenAI, Type } from "@google/genai";
import { Tab, AIResult } from "../types";

export interface StreamUpdate {
  status: 'initializing' | 'analyzing' | 'retry' | 'success' | 'error';
  message?: string;
  data?: AIResult;
  sources?: any[];
}

/**
 * Categorizes tabs using the browser-side Gemini client.
 * Uses the API key provided by the user through the AI Studio dialog.
 */
export const categorizeTabs = async (
  tabs: Tab[], 
  onUpdate: (update: StreamUpdate) => void
): Promise<void> => {
  if (!tabs.length) return;

  // Rule: Always create a new GoogleGenAI instance right before the call
  // to ensure we have the most up-to-date API key from the selection dialog.
  const apiKey = (process.env.API_KEY as string);
  
  if (!apiKey) {
    onUpdate({ 
      status: 'error', 
      message: 'No API key selected. Please connect your API key first.' 
    });
    return;
  }

  try {
    onUpdate({ status: 'initializing', message: 'Initializing Gemini 2.0...' });
    
    const ai = new GoogleGenAI({ apiKey });
    const tabList = tabs.map((t, idx) => `[${idx}] Title: ${t.title} | URL: ${t.url}`).join('\n');

    onUpdate({ status: 'analyzing', message: 'Analyzing tabs with AI...' });

    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash-lite',
      contents: `You are an expert browser tab organizer. Categorize the following tabs into 4-6 logical groups.
      Use Google Search grounding to better understand the content of any ambiguous URLs.
      
      Each group must have:
      - name: A punchy name (e.g., "Research", "Dev Ops", "Shopping")
      - description: A short reason why these tabs are together.
      - color: A vibrant CSS hex color code.
      - tabIndices: The numbers (0, 1, 2...) of the tabs belonging to it.
      
      Tabs to organize:
      ${tabList}`,
      config: {
        tools: [{ googleSearch: {} }],
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            groups: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING },
                  description: { type: Type.STRING },
                  color: { type: Type.STRING },
                  tabIndices: {
                    type: Type.ARRAY,
                    items: { type: Type.INTEGER }
                  }
                },
                required: ["name", "description", "color", "tabIndices"]
              }
            }
          },
          required: ["groups"]
        }
      }
    });

    const result = JSON.parse(response.text || "{}");
    const sources = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];

    onUpdate({ 
      status: 'success', 
      data: result as AIResult,
      sources: sources
    });
  } catch (error: any) {
    console.error("Categorization failed:", error);
    
    // Check for specific "Entity not found" error which often indicates key issues
    if (error.message?.includes("Requested entity was not found")) {
      onUpdate({ 
        status: 'error', 
        message: 'API Key invalid or project not found. Please try re-selecting your key.' 
      });
    } else {
      onUpdate({ 
        status: 'error', 
        message: error instanceof Error ? error.message : String(error) 
      });
    }
  }
};
