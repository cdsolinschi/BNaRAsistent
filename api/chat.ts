// FIX: Implemented a Vercel Edge Function to securely handle chat requests, stream responses from the Gemini API, and enable Google Search grounding for up-to-date answers.
import { GoogleGenAI } from '@google/genai';

// Vercel Edge Functions configuration.
export const config = {
  runtime: 'edge',
};

// The main handler for the API route.
export default async function handler(req: Request) {
  // Only allow POST requests.
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method Not Allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Ensure the API key is available.
  if (!process.env.API_KEY) {
    return new Response(
      JSON.stringify({ error: 'API_KEY environment variable not set' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }

  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    // Parse the user's message from the request body.
    const { message } = await req.json();

    if (!message || typeof message !== 'string') {
      return new Response(
        JSON.stringify({ error: 'Message is required and must be a string' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // Request a streaming response from the Gemini API with Google Search grounding.
    const resultStream = await ai.models.generateContentStream({
      model: 'gemini-2.5-flash',
      contents: message,
      config: {
        tools: [{ googleSearch: {} }],
      },
    });

    // Create a streaming response to send back to the client.
    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();
        try {
          for await (const chunk of resultStream) {
            // Format each chunk as a Server-Sent Event (SSE).
            // JSON.stringify will correctly handle the `text` getter on the chunk.
            const sseChunk = `data: ${JSON.stringify(chunk)}\n\n`;
            controller.enqueue(encoder.encode(sseChunk));
          }
        } catch (error) {
          // Handle potential errors during the streaming process.
          console.error('Error during stream processing:', error);
          const errorPayload = { text: `\n\n[EROARE]: A apărut o problemă. Vă rugăm să reîncercați.` };
          const sseError = `data: ${JSON.stringify(errorPayload)}\n\n`;
          controller.enqueue(encoder.encode(sseError));
        } finally {
          controller.close();
        }
      },
    });

    // Return the response stream.
    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    });
  } catch (error) {
    // Handle errors that occur before the stream starts.
    console.error('Error in chat handler:', error);
    const errorMessage =
      error instanceof Error ? error.message : 'An unknown error occurred.';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
