// FIX: Replaced placeholder content with a fully functional React chat application component.
import React, { useState, useEffect, useRef } from 'react';
import { ChatMessage as ChatMessageType, Role, Source } from './types';
import { sendMessageStream, StreamedChatResponse } from './services/geminiService';
import ChatMessage from './components/ChatMessage';
import ChatInput from './components/ChatInput';

const welcomeMessageText = `Bun venit! Sunt asistentul virtual al Bibliotecii Naționale a României.

**Notă de confidențialitate:** Această conversație nu este înregistrată.
**Sugestie:** Asistentul înțelege întrebările mai bine în limba engleză (English).

Cum vă pot ajuta astăzi?
Welcome! I am the AI assistant of the National Library of Romania.

**Privacy Note:** This conversation is not recorded.

How can I help you today?`;

function App() {
  const [messages, setMessages] = useState<ChatMessageType[]>([
    {
      id: 'welcome-message',
      role: Role.Model,
      text: welcomeMessageText,
      sources: [],
    }
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const handleSendMessage = async (text: string) => {
    setIsLoading(true);
    const userMessage: ChatMessageType = {
      id: crypto.randomUUID(),
      role: Role.User,
      text: text,
      sources: [],
    };
    
    const modelMessageId = crypto.randomUUID();
    // Add user message and a placeholder for the model's response
    setMessages((prevMessages) => [
        ...prevMessages,
        userMessage,
        {
            id: modelMessageId,
            role: Role.Model,
            text: '',
            sources: [],
        }
    ]);

    let fullText = '';
    const sources = new Map<string, Source>();

    try {
      // Stream the response from the backend
      for await (const chunk of sendMessageStream(text)) {
        // The backend now sends a simple object with a 'text' property.
        if (chunk.text) {
          fullText += chunk.text;
        }

        const groundingChunks = chunk.candidates?.[0]?.groundingMetadata?.groundingChunks;
        if (groundingChunks) {
            for (const groundingChunk of groundingChunks) {
                if (groundingChunk.web && groundingChunk.web.uri && !sources.has(groundingChunk.web.uri)) {
                      sources.set(groundingChunk.web.uri, {
                        uri: groundingChunk.web.uri,
                        title: groundingChunk.web.title || '',
                    });
                }
            }
        }
        
        // Update the model's message in state as chunks are received
        setMessages((prevMessages) =>
          prevMessages.map((msg) =>
            msg.id === modelMessageId
              ? { ...msg, text: fullText, sources: Array.from(sources.values()) }
                            : msg
          )
        );
      }
    } catch (error) {
      console.error('Error handling send message:', error);
      const errorMessage =
        error instanceof Error ? error.message : 'An unknown error occurred.';
        
      setMessages((prevMessages) =>
        prevMessages.map((msg) =>
          msg.id === modelMessageId ? { ...msg, text: `Eroare: ${errorMessage}`, sources: [] } : msg
        )
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-gray-50 dark:bg-gray-900">
      <header className="p-4 border-b dark:border-gray-700 shadow-sm">
        <h1 className="text-xl font-bold text-gray-800 dark:text-white">Asistent Chat</h1>
      </header>
      <main className="flex-1 overflow-y-auto p-6">
        <div className="max-w-4xl mx-auto space-y-8">
          {messages.map((message) => (
            <ChatMessage
              key={message.id}
              message={message}
              isLoading={isLoading && message.role === Role.Model && message.text === ''}
            />
          ))}
          <div ref={messagesEndRef} />
        </div>
      </main>
      <footer className="p-4 bg-white dark:bg-gray-800 border-t dark:border-gray-700">
        <div className="max-w-4xl mx-auto">
          <ChatInput onSendMessage={handleSendMessage} isLoading={isLoading} />
        </div>
      </footer>
    </div>
  );
}

export default App;