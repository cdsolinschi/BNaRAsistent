// FIX: Replaced placeholder content with a functional serverless API endpoint.
// This file acts as a secure backend to handle communication with the Gemini API.
import { GoogleGenAI } from '@google/genai';

// Specifies the Vercel Edge Runtime for efficient streaming.
export const runtime = 'edge';

/**
 * Handles POST requests to the /api/chat endpoint.
 * It streams responses from the Google Gemini API to the client.
 * @param req The incoming request object.
 * @returns A streaming Response object.
 */
export default async function handler(req: Request) {
  // Ensure the request is a POST request.
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    // 1. Extract the user's message from the request body.
    const { message } = await req.json();

    if (!message) {
      return new Response(JSON.stringify({ error: 'Message is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // 2. Verify that the API key is set in the environment variables.
    if (!process.env.API_KEY) {
      // This error is sent to the client and should be handled there.
      return new Response(
        JSON.stringify({
          error:
            'API key not found. Please configure the API_KEY environment variable.',
        }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        },
      );
    }

    // 3. Initialize the Google GenAI client.
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

    // 4. Request a streaming response from the Gemini model.
    // We enable search grounding to get up-to-date information.
    const stream = await ai.models.generateContentStream({
      model: 'gemini-2.5-flash',
      contents: message,
      config: {
        tools: [{ googleSearch: {} }],
      },
    });

    // 5. Create a ReadableStream to send Server-Sent Events (SSE) to the client.
    const responseStream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();
        // 6. Iterate over the chunks from the Gemini API stream.
        for await (const chunk of stream) {
          // The frontend expects a JSON string for each event.
          // Note: The `text` getter from the SDK's `GenerateContentResponse` chunk
          // is not serialized, but the frontend client is designed to reconstruct
          // the full text from the `candidates` array.
          const jsonString = JSON.stringify(chunk);
          const data = `data: ${jsonString}\n\n`;
          controller.enqueue(encoder.encode(data));
        }
        // 7. Close the stream when all chunks have been sent.
        controller.close();
      },
    });

    // 8. Return the streaming response to the client.
    return new Response(responseStream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    });
  } catch (error) {
    console.error('Error in /api/chat:', error);
    const errorMessage =
      error instanceof Error ? error.message : 'An unknown error occurred';
    // This will be caught by the frontend's `!response.ok` check.
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
