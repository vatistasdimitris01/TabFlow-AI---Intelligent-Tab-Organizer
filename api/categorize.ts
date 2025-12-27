
import { GoogleGenAI, Type } from "@google/genai";

export const config = {
  runtime: 'edge',
};

export default async function handler(req: Request) {
  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 });
  }

  try {
    const { tabs } = await req.json();
    const apiKey = process.env.API_KEY;

    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'API_KEY is not configured on the server.' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const ai = new GoogleGenAI({ apiKey });
    const tabList = tabs.map((t: any, idx: number) => `[${idx}] Title: ${t.title} | URL: ${t.url}`).join('\n');

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

    return new Response(response.text, {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
