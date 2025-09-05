
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ChatMessage as ChatMessageType, Role, Source } from './types';
import { sendMessageStream } from './services/geminiService';
import ChatMessage from './components/ChatMessage';
import ChatInput from './components/ChatInput';

const App: React.FC = () => {
  const [messages, setMessages] = useState<ChatMessageType[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMessages([
      {
        id: 'initial-message',
        role: Role.Model,
        text: 'Bun venit la asistentul AI al Bibliotecii Naționale a României! Cum vă pot ajuta astăzi? Voi încerca să răspund la întrebările dumneavoastră folosind informații de pe domeniul bibnat.ro.',
        sources: [],
      },
    ]);
  }, []);

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSendMessage = useCallback(async (text: string) => {
    if (!text.trim() || isLoading) return;

    setIsLoading(true);
    const userMessage: ChatMessageType = {
      id: `user-${Date.now()}`,
      role: Role.User,
      text,
      sources: [],
    };
    
    setMessages((prev) => [...prev, userMessage]);

    const modelMessageId = `model-${Date.now()}`;
    const initialModelMessage: ChatMessageType = {
      id: modelMessageId,
      role: Role.Model,
      text: '',
      sources: [],
    };
    setMessages((prev) => [...prev, initialModelMessage]);

    try {
      const stream = sendMessageStream(text);
      let fullResponseText = '';
      let sources: Source[] = [];
      
      for await (const chunk of stream) {
        fullResponseText += chunk.text;
        
        const chunkSources = chunk.candidates?.[0]?.groundingMetadata?.groundingChunks?.map((c: any) => ({
          title: c.web.title,
          uri: c.web.uri,
        })).filter(Boolean) || [];
        
        // Naive merge, replace with a more sophisticated one if sources are sent incrementally
        if (chunkSources.length > 0) {
          sources = chunkSources;
        }

        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === modelMessageId ? { ...msg, text: fullResponseText, sources: sources } : msg
          )
        );
      }

    } catch (error) {
      console.error('Error sending message:', error);
      const errorMessage: ChatMessageType = {
        id: `error-${Date.now()}`,
        role: Role.Model,
        text: 'Ne pare rău, a apărut o eroare. Vă rugăm să încercați din nou mai târziu.',
        sources: [],
      };
      setMessages((prev) => [...prev.filter(m => m.id !== modelMessageId), errorMessage]);
    } finally {
      setIsLoading(false);
    }
  }, [isLoading]);


  return (
    <div className="flex flex-col h-screen font-sans bg-gray-50 dark:bg-gray-900 text-gray-800 dark:text-gray-200">
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-4 shadow-sm">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-2xl font-bold text-blue-800 dark:text-blue-300">BibNat AI Assistant</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">Powered by Gemini & Google Search</p>
        </div>
      </header>

      <main ref={chatContainerRef} className="flex-1 overflow-y-auto p-4 md:p-6">
        <div className="max-w-4xl mx-auto space-y-6">
          {messages.map((msg) => (
            <ChatMessage key={msg.id} message={msg} isLoading={isLoading && msg.id.startsWith('model-') && msg.text === ''} />
          ))}
        </div>
      </main>

      <footer className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 p-4">
        <div className="max-w-4xl mx-auto">
          <ChatInput onSendMessage={handleSendMessage} isLoading={isLoading} />
        </div>
      </footer>
    </div>
  );
};

export default App;
