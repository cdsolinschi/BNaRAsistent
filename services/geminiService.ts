import { GenerateContentResponse } from "@google/genai";
import { ChatMessage, Role, Source } from "../types";

// The initChat function is no longer needed on the frontend.
// The chat will be initialized on-demand by our secure backend.

export async function* sendMessageStream(message: string): AsyncGenerator<GenerateContentResponse> {
  try {
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ message }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `Request failed with status ${response.status}`);
    }

    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('Could not get reader from response body');
    }

    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        break;
      }

      // Parse the server-sent event format
      const chunk = decoder.decode(value);
      const lines = chunk.split('\n').filter(line => line.trim().startsWith('data:'));
      
      for (const line of lines) {
        const jsonString = line.replace(/^data: /, '');
        if (jsonString) {
          try {
            const parsedChunk = JSON.parse(jsonString);
            yield parsedChunk as GenerateContentResponse;
          } catch (e) {
            console.error("Failed to parse stream chunk:", jsonString);
          }
        }
      }
    }
  } catch (error) {
    console.error("Error in sendMessageStream:", error);
    // Yield a final error message object to be displayed in the chat
    const errorResponse = {
      text: "Scuze, a apărut o problemă de conexiune. Vă rugăm reîncercați.",
      candidates: [],
    };
    // FIX: The manually created errorResponse object does not fully match the GenerateContentResponse type.
    // We cast it here to satisfy the generator's return type. This is safe because the UI only
    // consumes the 'text' and 'candidates' properties, which are present in our object.
    yield errorResponse as GenerateContentResponse;
  }
}
