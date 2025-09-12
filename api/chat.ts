import { GoogleGenAI } from '@google/genai';

// Configure this as a Vercel Edge Function
export const config = {
  runtime: 'edge',
};

// The main handler for the API route
export default async function handler(req: Request) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 });
  }

  try {
    const { message } = await req.json();

    // Validate that a message was provided
    if (!message) {
      return new Response(JSON.stringify({ error: 'Message is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Ensure the API key is configured in environment variables
    if (!process.env.API_KEY) {
      return new Response(JSON.stringify({ error: 'API key not configured' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // FIX: Initialize the Google Gemini AI client using the API key from environment variables.
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

    // Request a streaming response from the model
    // FIX: Use the 'gemini-2.5-flash' model and enable Google Search grounding for up-to-date information.
    const stream = await ai.models.generateContentStream({
        model: 'gemini-2.5-flash',
        contents: message,
        config: {
            // Enable Google Search grounding for up-to-date information
            tools: [{ googleSearch: {} }],
        },
    });

    // Create a ReadableStream to send the response back to the client
    const readableStream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();
        for await (const chunk of stream) {
          // Format the chunk as a Server-Sent Event (SSE)
          // The frontend service is designed to parse this format.
          const sseChunk = `data: ${JSON.stringify(chunk)}\n\n`;
          controller.enqueue(encoder.encode(sseChunk));
        }
        controller.close();
      },
    });

    // Return the streaming response
    return new Response(readableStream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });

  } catch (error) {
    console.error('Error in /api/chat:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred on the server.';
    // Return a structured error response
    return new Response(JSON.stringify({ error: `API Error: ${errorMessage}` }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
