import { GoogleGenAI, Type } from "@google/genai";
import { Tab, AIResult } from "../types";

export const categorizeTabs = async (tabs: Tab[]): Promise<AIResult | null> => {
  if (!tabs.length) return null;

  // Initializing right before use ensures we get the latest injected process.env.API_KEY
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    throw new Error("API key is missing. Please ensure API_KEY is set in your Vercel Environment Variables and you have redeployed.");
  }

  const ai = new GoogleGenAI({ apiKey });
  const tabList = tabs.map((t, idx) => `[${idx}] Title: ${t.title} | URL: ${t.url}`).join('\n');

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash-lite',
      contents: `You are an expert browser tab organizer. Categorize the following tabs into 4-6 logical groups. 
      Each group must have:
      - name: A punchy name (e.g., "Research", "Social", "Dev Tools")
      - description: A very short reason why these tabs are together.
      - color: A vibrant CSS hex color code.
      - tabIndices: The numbers (0, 1, 2...) of the tabs belonging to it.
      
      Tabs to organize:
      ${tabList}`,
      config: {
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

    return JSON.parse(response.text) as AIResult;
  } catch (error) {
    console.error("AI Categorization failed:", error);
    throw error;
  }
};