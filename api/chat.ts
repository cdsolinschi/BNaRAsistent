
import { GoogleGenAI, Chat, GenerateContentResponse } from "@google/genai";

// This file is a serverless function and will be deployed as a backend API route.
// The API_KEY is read from secure server-side environment variables.
if (!process.env.API_KEY) {
  throw new Error("API_KEY environment variable not set on the server");
}

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const SYSTEM_INSTRUCTION = `You are an expert reference librarian for the National Library of Romania (Biblioteca Națională a României). Your name is 'BiblioAI'. You must answer questions based exclusively on information found on the bibnat.ro domain. Always be helpful, polite, and professional. If you cannot find an answer within the bibnat.ro domain, state that your knowledge is limited to that source and you cannot answer the question. Respond in Romanian, as your primary users are Romanian speakers.`;

// The API handler function.
export default async function handler(req: Request) {
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

    const chat = ai.chats.create({
        model: 'gemini-2.5-flash',
        config: {
          systemInstruction: SYSTEM_INSTRUCTION,
          tools: [{ googleSearch: {} }],
        },
    });

    const stream = await chat.sendMessageStream({ message });

    // Create a new readable stream to pipe the response from Gemini to the client.
    const readableStream = new ReadableStream({
      async start(controller) {
        for await (const chunk of stream) {
            const chunkString = JSON.stringify(chunk);
            controller.enqueue(`data: ${chunkString}\n\n`);
        }
        controller.close();
      },
    });

    return new Response(readableStream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });

  } catch (error) {
    console.error("Error in API route:", error);
    return new Response(JSON.stringify({ error: 'Internal Server Error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
