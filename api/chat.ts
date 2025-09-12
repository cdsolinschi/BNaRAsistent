/**
 * This file defines the API route for the chat functionality.
 * It is a Vercel Edge Function that streams responses from the Google Gemini API.
 */

import { GoogleGenAI } from "@google/genai";

// Vercel Edge Functions are fast and allow for streaming responses,
// which is ideal for a real-time chat application.
export const config = {
  runtime: 'edge',
};

/**
 * The main handler for the /api/chat route.
 * It receives a user's message, sends it to the Gemini API, and streams
 * the response back to the client using Server-Sent Events (SSE).
 *
 * @param {Request} request The incoming HTTP request.
 * @returns {Promise<Response>} A streaming response or an error response.
 */
export default async function handler(request: Request): Promise<Response> {
  // Only allow POST requests for this endpoint.
  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method Not Allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    // Extract the user's message from the request body.
    const { message } = await request.json();

    if (!message || typeof message !== 'string') {
      return new Response(JSON.stringify({ error: 'Message is required and must be a string' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    
    // Ensure the API key is configured in environment variables.
    if (!process.env.API_KEY) {
      console.error('API_KEY environment variable not set');
      return new Response(JSON.stringify({ error: 'Server configuration error: API key not found' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Initialize the Google GenAI client.
    const ai = new GoogleGenAI({apiKey: process.env.API_KEY});

    // Request a streaming response from the Gemini model.
    // We enable Google Search grounding to provide up-to-date, verifiable answers.
    const stream = await ai.models.generateContentStream({
      model: 'gemini-2.5-flash',
      contents: message,
      config: {
        tools: [{ googleSearch: {} }],
      },
    });

    // Create a new ReadableStream to send events to the client.
    const encoder = new TextEncoder();
    const readableStream = new ReadableStream({
      async start(controller) {
        // Iterate over the chunks of data from the Gemini API stream.
        for await (const chunk of stream) {
          // The `text` property on a `GenerateContentResponse` chunk is a getter.
          // To ensure it gets correctly serialized to JSON when sent to the client,
          // we create a new plain object and explicitly copy the `text` and `candidates`
          // properties. This new object matches the `StreamedChatResponse` type
          // expected by the frontend.
          const payload = {
            text: chunk.text,
            candidates: chunk.candidates,
          };
          
          // Format the chunk as a Server-Sent Event (SSE) and enqueue it.
          const chunkText = JSON.stringify(payload);
          controller.enqueue(encoder.encode(`data: ${chunkText}\n\n`));
        }
        // Signal that we are done sending chunks.
        controller.close();
      },
    });

    // Return the stream as the response to the client.
    return new Response(readableStream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });

  } catch (error) {
    console.error('Error in /api/chat handler:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    
    // In case of an error before streaming starts, send a standard JSON error response.
    return new Response(JSON.stringify({ error: `Internal Server Error: ${errorMessage}` }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
