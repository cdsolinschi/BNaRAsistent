import React, { useState, useEffect, useRef } from 'react';
import { ChatMessage as ChatMessageType, Role, Source } from './types';
import ChatInput from './components/ChatInput';
import ChatMessage from './components/ChatMessage';
import { sendMessageStream } from './services/geminiService';

// A simple unique ID generator
const getUniqueId = () => `id-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

function App() {
  const [messages, setMessages] = useState<ChatMessageType[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to the bottom of the chat on new messages
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages]);

  // Handle sending a message from the input
  const handleSendMessage = async (text: string) => {
    // Prevent sending messages while a response is being generated
    if (isLoading) return;

    const userMessage: ChatMessageType = {
      id: getUniqueId(),
      role: Role.User,
      text,
      sources: [],
    };
    
    // Add user message and a placeholder for the model's response
    const modelMessageId = getUniqueId();
    setMessages((prev) => [
      ...prev,
      userMessage,
      {
        id: modelMessageId,
        role: Role.Model,
        text: '',
        sources: [],
      },
    ]);
    
    setIsLoading(true);

    try {
      let fullResponseText = '';
      const sourceMap = new Map<string, Source>();

      // Call the backend API and stream the response
      for await (const chunk of sendMessageStream(text)) {
        // Extract text from the chunk. Handle both regular text and potential error text.
        const chunkText = chunk.candidates?.[0]?.content?.parts?.[0]?.text || chunk.text || '';
        if (chunkText) {
          fullResponseText += chunkText;
        }

        // Extract and deduplicate sources from grounding metadata
        const chunkSources = chunk.candidates?.[0]?.groundingMetadata?.groundingChunks?.map(
            (c: { web: { title: string; uri: string } }) => ({
              title: c.web.title,
              uri: c.web.uri,
            })
          ) || [];
        
        for (const source of chunkSources) {
            if (source.uri && !sourceMap.has(source.uri)) {
                sourceMap.set(source.uri, source);
            }
        }
        
        // Update the model's message in the state with the new content
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === modelMessageId
              ? { ...msg, text: fullResponseText, sources: Array.from(sourceMap.values()) }
              : msg
          )
        );
      }
    } catch (error) {
      console.error('Error streaming response:', error);
      // Update the placeholder with a user-friendly error message
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === modelMessageId
            ? { ...msg, text: 'Scuze, a apărut o problemă. Vă rugăm să reîncercați.' }
            : msg
        )
      );
    } finally {
      setIsLoading(false);
    }
  };

  // Set the initial welcome message when the component mounts
  useEffect(() => {
    setMessages([
      {
        id: getUniqueId(),
        role: Role.Model,
        text: 'Salut! Sunt asistentul virtual al Bibliotecii Naționale a României. Cum te pot ajuta astăzi?',
        sources: [],
      }
    ]);
  }, []);

  return (
    <div className="flex flex-col h-screen bg-gray-50 dark:bg-gray-900 text-gray-800 dark:text-gray-200 font-sans">
      <header className="p-4 border-b dark:border-gray-700 shadow-sm bg-white dark:bg-gray-800 flex-shrink-0">
        <h1 className="text-xl font-bold text-gray-900 dark:text-white text-center">Asistent AI - BibNat</h1>
      </header>
      <main ref={chatContainerRef} className="flex-1 overflow-y-auto p-6 space-y-6">
        {messages.map((msg, index) => (
          <ChatMessage
            key={msg.id}
            message={msg}
            // Show loading spinner only for the last message if it's from the model and we are loading
            isLoading={isLoading && index === messages.length - 1 && msg.role === Role.Model}
          />
        ))}
      </main>
      <footer className="p-4 bg-white dark:bg-gray-800 border-t dark:border-gray-700 flex-shrink-0">
        <ChatInput onSendMessage={handleSendMessage} isLoading={isLoading} />
      </footer>
    </div>
  );
}

export default App;
