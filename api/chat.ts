// FIX: Implemented the full backend for the chat API endpoint.
import { GoogleGenAI } from '@google/genai';

// Tell Vercel to run this as an edge function for streaming support
export const config = {
  runtime: 'edge',
};

// The main handler for the /api/chat route
export default async function handler(req: Request) {
  // We only want to handle POST requests
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    // Parse the request body to get the user's message
    const { message } = await req.json();

    if (!message || typeof message !== 'string') {
      return new Response(JSON.stringify({ error: 'Message is required and must be a string' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Initialize the Google Gemini AI client with the API key from environment variables
    // As per guidelines, process.env.API_KEY is assumed to be available.
    const ai = new GoogleGenAI({apiKey: process.env.API_KEY!});

    // Call the model to generate content in a streaming fashion
    const streamingResponse = await ai.models.generateContentStream({
      model: 'gemini-2.5-flash',
      contents: message,
      config: {
        systemInstruction: 'You are a helpful and friendly virtual assistant for the National Library of Romania (Biblioteca Națională a României). Your purpose is to assist users with inquiries related to the library, its collections, services, and Romanian culture and history. Answer user questions based on the provided search results. Your answers must always be in Romanian.',
        tools: [{ googleSearch: {} }],
      },
    });

    // Create a streaming response using the ReadableStream API
    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();
        try {
          // Iterate over the chunks from the Gemini API
          for await (const chunk of streamingResponse) {
            // Format the chunk as a Server-Sent Event (SSE)
            // The frontend expects a JSON object. JSON.stringify correctly handles
            // the GenerateContentResponse object from the SDK, including the .text getter.
            const data = `data: ${JSON.stringify(chunk)}\n\n`;
            controller.enqueue(encoder.encode(data));
          }
        } catch (error) {
          console.error('Error during stream processing:', error);
          // Send an error message to the client through the stream
          const errorChunk = {
            text: 'A apărut o eroare în timpul procesării răspunsului. Vă rugăm să reîncercați.',
          };
          const data = `data: ${JSON.stringify(errorChunk)}\n\n`;
          controller.enqueue(encoder.encode(data));
        } finally {
          // Close the stream when we're done
          controller.close();
        }
      },
    });

    // Return the stream as the response
    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });

  } catch (error) {
    console.error('Error in chat API handler:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
    
    // For top-level errors (e.g., failed to parse JSON), return a standard HTTP error
    return new Response(JSON.stringify({ error: `Internal Server Error: ${errorMessage}` }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
