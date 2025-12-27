
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
    
    // 1. Check if user provided their own key in the request header
    const userApiKey = req.headers.get('X-Gemini-API-Key');
    
    // 2. Get environment keys for rotation/fallback
    const rawKeys = process.env.API_KEY || "";
    const envApiKeys = rawKeys.split(',').map(k => k.trim()).filter(k => k.length > 0);

    // Prioritize user key, then env keys
    const keysToTry = userApiKey ? [userApiKey] : envApiKeys;

    if (keysToTry.length === 0) {
      return new Response(JSON.stringify({ error: 'No API key available. Please connect your own key or configure the server.' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const tabList = tabs.map((t: any, idx: number) => `[${idx}] Title: ${t.title} | URL: ${t.url}`).join('\n');
    const encoder = new TextEncoder();

    const stream = new ReadableStream({
      async start(controller) {
        let lastError: any = null;
        
        for (let i = 0; i < keysToTry.length; i++) {
          const apiKey = keysToTry[i];
          try {
            const ai = new GoogleGenAI({ apiKey });
            controller.enqueue(encoder.encode(JSON.stringify({ 
              status: 'analyzing', 
              message: userApiKey ? 'Using your personal API key...' : `Using system key (Rotation ${i+1}/${keysToTry.length})...` 
            }) + '\n'));

            const response = await ai.models.generateContent({
              model: 'gemini-2.0-flash-lite',
              contents: `You are an expert browser tab organizer. Categorize the following tabs into 4-6 logical groups.
              Use Google Search grounding to better understand the content of any ambiguous URLs.
              
              Each group must have:
              - name: A punchy name
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
            
            controller.enqueue(encoder.encode(JSON.stringify({ 
              status: 'success', 
              data: result,
              sources: sources
            }) + '\n'));
            controller.close();
            return;

          } catch (error: any) {
            lastError = error;
            const isRateLimit = error.message?.includes('429') || error.message?.includes('Quota');
            
            if (isRateLimit && !userApiKey && i < keysToTry.length - 1) {
              controller.enqueue(encoder.encode(JSON.stringify({ status: 'retry', message: 'Quota exhausted. Rotating keys...' }) + '\n'));
              continue;
            } else {
              break;
            }
          }
        }

        controller.enqueue(encoder.encode(JSON.stringify({ 
          status: 'error', 
          message: lastError?.message || 'Failed to process request.' 
        }) + '\n'));
        controller.close();
      }
    });

    return new Response(stream, {
      headers: { 'Content-Type': 'application/x-ndjson' },
    });

  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
