// FIX: Replaced placeholder with a functional React component.
import React, { useState, useEffect, useRef } from 'react';
import ChatInput from './components/ChatInput';
import ChatMessage from './components/ChatMessage';
import { ChatMessage as ChatMessageType, Role, Source } from './types';
import { sendMessageStream } from './services/geminiService';

const App: React.FC = () => {
  const [messages, setMessages] = useState<ChatMessageType[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Add an initial message from the model on component mount
  useEffect(() => {
    setMessages([
      {
        id: crypto.randomUUID(),
        role: Role.Model,
        text: 'Salut! Sunt asistentul tău AI pentru Biblioteca Națională. Cum te pot ajuta astăzi?',
        sources: [],
      },
    ]);
  }, []);

  const handleSendMessage = async (text: string) => {
    const userMessage: ChatMessageType = {
      id: crypto.randomUUID(),
      role: Role.User,
      text: text,
      sources: [],
    };

    const modelMessageId = crypto.randomUUID();
    const modelMessage: ChatMessageType = {
      id: modelMessageId,
      role: Role.Model,
      text: '',
      sources: [],
    };

    setMessages((prevMessages) => [...prevMessages, userMessage, modelMessage]);
    setIsLoading(true);

    let fullResponseText = '';
    let sources: Source[] = [];

    try {
      for await (const chunk of sendMessageStream(text)) {
        if (chunk.text && !chunk.candidates) {
          // This handles the custom error message from the service
          fullResponseText = chunk.text;
          sources = [];
          break; // Stop processing further chunks
        }

        fullResponseText +=
          chunk.candidates?.[0]?.content?.parts?.[0]?.text || '';

        const groundingChunks =
          chunk.candidates?.[0]?.groundingMetadata?.groundingChunks;
        if (groundingChunks) {
          const newSources = groundingChunks
            .map((c) => ({ uri: c.web.uri, title: c.web.title }))
            .filter((s) => s.uri && s.title);

          // Merge and deduplicate sources
          const allSources = [...sources, ...newSources];
          sources = [
            ...new Map(allSources.map((item) => [item.uri, item])).values(),
          ];
        }

        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === modelMessageId
              ? { ...msg, text: fullResponseText, sources: sources }
              : msg,
          ),
        );
      }
    } catch (error) {
      console.error('Error sending message:', error);
      fullResponseText =
        'Scuze, a apărut o problemă de conexiune. Vă rugăm să reîncercați.';
      sources = [];
    } finally {
      // Final update to ensure the complete message is set
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === modelMessageId
            ? { ...msg, text: fullResponseText, sources: sources }
            : msg,
        ),
      );
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-gray-50 dark:bg-gray-900 font-sans">
      <header className="p-4 border-b dark:border-gray-700 shadow-sm bg-white dark:bg-gray-800">
        <h1 className="text-xl font-bold text-gray-800 dark:text-white text-center">
          Asistent AI - Biblioteca Națională
        </h1>
      </header>
      <div className="flex-1 overflow-y-auto p-4 md:p-6">
        <div className="max-w-3xl mx-auto space-y-6">
          {messages.map((message) => (
            <ChatMessage
              key={message.id}
              message={message}
              isLoading={
                isLoading && message.id === messages[messages.length - 1].id
              }
            />
          ))}
          <div ref={messagesEndRef} />
        </div>
      </div>
      <footer className="p-4 bg-white dark:bg-gray-800 border-t dark:border-gray-700">
        <div className="max-w-3xl mx-auto">
          <ChatInput onSendMessage={handleSendMessage} isLoading={isLoading} />
          <p className="text-xs text-center text-gray-500 dark:text-gray-400 mt-3">
            Asistentul AI poate face greșeli. Verificați informațiile
            importante.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default App;
