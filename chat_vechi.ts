// FIX: Implement the backend API endpoint for chat, which was previously a placeholder.
// This handler streams responses from the Google Gemini API using Vercel Edge Functions.
import { GoogleGenAI, GenerateContentResponse } from '@google/genai';

// This is required for Vercel Edge Functions, a common serverless platform for Vite projects.
export const config = {
  runtime: 'edge',
};

/**
 * API handler for the /api/chat route.
 * It streams responses from the Google Gemini API.
 */
export default async function handler(req: Request): Promise<Response> {
  // Ensure the request is a POST request.
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    // The API key is expected to be set as an environment variable.
    if (!process.env.API_KEY) {
      throw new Error("API_KEY environment variable is not set");
    }
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const modelName = 'gemini-2.5-flash';
    
    const { message } = await req.json();

    if (!message || typeof message !== 'string') {
      return new Response(JSON.stringify({ error: 'Message is required and must be a string' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // FINAL FIX: Force the search to be on the bibnat.ro domain
    const contents = `site:bibnat.ro ${message}`;
    const systemInstruction = "Ești un asistent virtual pentru Biblioteca Națională a României. Răspunde în limba română. Bazează-ți răspunsurile exclusiv pe sursele furnizate din domeniul bibnat.ro. Nu oferi informații din alte surse.";

    // Get a streaming response from the Gemini model.
    const result = await ai.models.generateContentStream({
      model: modelName,
      contents: contents,
      config: {
        systemInstruction: systemInstruction,
        // Enable Google Search grounding for up-to-date and factual answers.
        tools: [{ googleSearch: {} }],
      },
    });

    // Create a new ReadableStream to send data to the client.
    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();
        // The result is a promise that resolves to the stream
        for await (const chunk of result) {
            // The .text is a getter that joins the text parts of the chunk.
            // We create a new simple object to ensure the text property is serialized.
            const dataToSend = {
                text: chunk.text,
                candidates: chunk.candidates,
            };
            const jsonString = JSON.stringify(dataToSend);
            controller.enqueue(encoder.encode(`data: ${jsonString}\n\n`));
        }
        controller.close();
      },
    });

    // Return the stream as the response.
    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (error) {
    console.error('Error in /api/chat:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    // Return an error response if something goes wrong.
    return new Response(JSON.stringify({ error: `Internal Server Error: ${errorMessage}` }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
