// FIX: This file replaces the placeholder content and implements the backend logic for the chat API.
import { GoogleGenAI } from '@google/genai';

// FIX: Per coding guidelines, ensure the API_KEY environment variable is checked for existence.
if (!process.env.API_KEY) {
  throw new Error('The API_KEY environment variable is not set.');
}

// FIX: Per coding guidelines, initialize GoogleGenAI with a named apiKey object.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

/**
 * This is a generic handler for a serverless function environment (e.g., Vercel, Netlify).
 * It expects a POST request with a JSON body containing a `message` string.
 * It streams a response from the Gemini API using Server-Sent Events.
 *
 * @param {Request} req The incoming request object.
 * @returns {Promise<Response>} A promise that resolves to the response object.
 */
export default async function handler(req: Request): Promise<Response> {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method Not Allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const { message } = await req.json();

    if (!message || typeof message !== 'string') {
      return new Response(JSON.stringify({ error: 'Message is required and must be a string' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // FIX: Use the 'gemini-2.5-flash' model as recommended for text tasks.
    // FIX: Enable Google Search grounding to provide web sources for answers.
    const result = await ai.models.generateContentStream({
      model: 'gemini-2.5-flash',
      contents: message,
      config: {
        tools: [{ googleSearch: {} }],
      },
    });

    // Create a streaming response using Server-Sent Events
    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();
        for await (const chunk of result) {
          // The client-side service expects this SSE `data:` format.
          const data = `data: ${JSON.stringify(chunk)}\n\n`;
          controller.enqueue(encoder.encode(data));
        }
        controller.close();
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    });
  } catch (error) {
    console.error('Error in chat API handler:', error);
    const errorMessage =
      error instanceof Error ? error.message : 'An internal server error occurred.';
    // The client fetch handler will catch non-2xx responses and parse the JSON error.
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

// For environments like Vercel, you can export a config object.
// This example is compatible with the Edge runtime.
export const config = {
  runtime: 'edge',
};
