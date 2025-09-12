// FIX: Implemented the full backend for the /api/chat endpoint.
// This was missing and causing errors. This implementation creates a Vercel Edge
// Function that streams responses from the Google Gemini API.
import { GoogleGenAI } from '@google/genai';

// Vercel Edge Functions configuration.
// This tells Vercel to run this function at the edge for lower latency.
export const config = {
  runtime: 'edge',
};

// The main function handler for the /api/chat route
export default async function handler(req: Request) {
  // We only want to handle POST requests
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const { message } = await req.json();

    if (!message) {
      return new Response(JSON.stringify({ error: 'Message is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // According to the guidelines, the API key is available in `process.env.API_KEY`.
    const ai = new GoogleGenAI({apiKey: process.env.API_KEY!});

    // Call the Gemini API to generate content with streaming.
    // We enable Google Search grounding for up-to-date, real-world information.
    const stream = await ai.models.generateContentStream({
      model: 'gemini-2.5-flash',
      contents: message,
      config: {
        tools: [{ googleSearch: {} }],
      },
    });

    // Create a new ReadableStream to send the response chunks to the client.
    const readableStream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();

        // Iterate over the chunks from the Gemini API stream.
        for await (const chunk of stream) {
          // The `GenerateContentResponse` object from the SDK has a `text` getter.
          // `JSON.stringify` does not serialize getters, so we need to create a plain
          // object that includes the text content and the candidates for the frontend.
          // This matches the `StreamedChatResponse` type in `services/geminiService.ts`.
          const data = {
            text: chunk.text,
            candidates: chunk.candidates,
          };

          // Format the chunk as a Server-Sent Event (SSE) and send it.
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
        }

        // All chunks have been sent, so we can close the stream.
        controller.close();
      },
    });

    // Return the stream as the response.
    return new Response(readableStream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });

  } catch (error) {
    console.error('Error in /api/chat:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return new Response(JSON.stringify({ error: `Internal Server Error: ${errorMessage}` }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
