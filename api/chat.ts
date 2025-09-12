import { GoogleGenAI } from "@google/genai";

// FIX: Implement the backend API endpoint for streaming chat responses from the Gemini API.
// This is a Vercel Edge Function that streams Server-Sent Events to the client.

// Throws an error if the API key is not set in the environment variables.
// This key should be configured in your Vercel project settings.
if (!process.env.API_KEY) {
  throw new Error("The API_KEY environment variable is not set.");
}

// Initialize the Google Gemini API client with the API key.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// Configure the runtime environment to 'edge' for optimal streaming performance.
export const config = {
  runtime: "edge",
};

/**
 * The main handler for the API endpoint. It handles POST requests to /api/chat.
 * @param {Request} req The incoming request object.
 * @returns {Promise<Response>} A streaming response with Server-Sent Events.
 */
export default async function handler(req: Request): Promise<Response> {
  // Only allow POST requests.
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method Not Allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    // Parse the 'message' from the request body.
    const { message } = await req.json();

    if (!message || typeof message !== "string") {
      return new Response(
        JSON.stringify({ error: "A valid message string is required" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Call the Gemini API to generate content in a streaming fashion.
    // We use Google Search for grounding to get up-to-date information.
    const streamingResponse = await ai.models.generateContentStream({
      model: "gemini-2.5-flash",
      contents: message,
      config: {
        tools: [{ googleSearch: {} }],
      },
    });

    // Create a TransformStream to format the output from the Gemini API
    // into Server-Sent Events (SSE) format.
    const { readable, writable } = new TransformStream({
      transform(chunk, controller) {
        // The Gemini SDK yields GenerateContentResponse objects.
        // We serialize the entire chunk to JSON and send it in SSE format.
        const sse = `data: ${JSON.stringify(chunk)}\n\n`;
        controller.enqueue(new TextEncoder().encode(sse));
      },
    });

    // Pipe the stream from the Gemini API through our transformer.
    streamingResponse.stream.pipeTo(writable);

    // Return the readable stream as the response to the client.
    return new Response(readable, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    console.error("Error in /api/chat:", error);
    const errorMessage =
      error instanceof Error ? error.message : "An unexpected error occurred.";
    // Note: In an edge runtime, if the stream has already started, the client
    // might not receive this HTTP error. The client-side logic should handle
    // abrupt stream termination.
    return new Response(
      JSON.stringify({ error: `API Error: ${errorMessage}` }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}

