// FIX: Implement the backend API endpoint for chat functionality.
import { GoogleGenAI } from "@google/genai";

// This is required for Vercel Edge Functions to run on the Vercel edge network.
export const config = {
  runtime: 'edge',
};

// Initialize the Google Gemini AI client using the API key from environment variables.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });

/**
 * Handles the POST request to the /api/chat endpoint.
 * It receives a message from the client, sends it to the Gemini API with Google Search grounding,
 * and streams the response back to the client using Server-Sent Events.
 */
export default async function handler(req: Request) {
  // Ensure the request method is POST.
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    // Parse the message from the request body.
    const { message } = await req.json();

    if (!message || typeof message !== 'string') {
      return new Response(JSON.stringify({ error: 'Message is required and must be a string' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Call the Gemini API to generate content in a streaming fashion.
    const geminiStream = await ai.models.generateContentStream({
      model: "gemini-2.5-flash",
      contents: message,
      config: {
        // Provide system instructions for the model.
        systemInstruction: "You are a helpful AI assistant for the National Library of Romania (Biblioteca Națională a României). Your purpose is to answer user questions, primarily using information from the bibnat.ro domain. Always respond in Romanian.",
        // Use Google Search as a tool for grounding the response.
        tools: [{ googleSearch: {} }],
      },
    });

    // Create a ReadableStream to stream the response to the client.
    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();
        for await (const chunk of geminiStream) {
          // Format each chunk as a Server-Sent Event (SSE).
          const data = `data: ${JSON.stringify(chunk)}\n\n`;
          controller.enqueue(encoder.encode(data));
        }
        controller.close();
      },
    });

    // Return the stream as the response with appropriate SSE headers.
    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });

  } catch (error) {
    console.error('Error processing chat request:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    // Return an error response if something goes wrong.
    return new Response(JSON.stringify({ error: `Internal Server Error: ${errorMessage}` }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
