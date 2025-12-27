
import { GoogleGenAI, Type } from "@google/genai";
import { Tab, AIResult } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

export const categorizeTabs = async (tabs: Tab[]): Promise<AIResult | null> => {
  if (!tabs.length) return null;

  const tabList = tabs.map((t, idx) => `[${idx}] Title: ${t.title} | URL: ${t.url}`).join('\n');

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash-lite',
      contents: `You are an expert browser tab organizer. Categorize the following tabs into logical groups. 
      Each group should have a name, a short description, a vibrant CSS color hex code, and the indices of the tabs belonging to it.
      
      Tabs:
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

    const result = JSON.parse(response.text);
    return result as AIResult;
  } catch (error) {
    console.error("AI Categorization failed:", error);
    return null;
  }
};
