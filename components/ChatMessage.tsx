import React from 'react';
import { ChatMessage as ChatMessageType, Role } from '../types';
import LoadingSpinner from './LoadingSpinner';
import SourceLink from './SourceLink';

interface ChatMessageProps {
  message: ChatMessageType;
  isLoading: boolean;
}

// A simple component to render text with support for bolding (**text**).
const FormattedMessage: React.FC<{ text: string }> = ({ text }) => {
  const parts = text.split(/(\*\*.*?\*\*)/g);
  return (
    <p className="whitespace-pre-wrap">
      {parts.map((part, index) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          return <strong key={index}>{part.slice(2, -2)}</strong>;
        }
        return part;
      })}
    </p>
  );
};

const UserIcon: React.FC = () => (
  <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
    <span>TU</span>
  </div>
);

const ModelIcon: React.FC = () => (
  <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
      <path d="M9 4.804A7.968 7.968 0 005.5 4c-1.255 0-2.443.29-3.5.804v10.392C2.057 15.71 3.245 16 4.5 16h1.054c.254-1.681 1.73-3 3.446-3s3.192 1.319 3.446 3H13.5c1.255 0 2.443-.29 3.5-.804V4.804C15.943 4.29 14.755 4 13.5 4c-1.255 0-2.443.29-3.5.804V12a1 1 0 11-2 0V4.804z" />
    </svg>
  </div>
);

const ChatMessage: React.FC<ChatMessageProps> = ({ message, isLoading }) => {
  const isModel = message.role === Role.Model;

  return (
    <div className={`flex items-start gap-4 ${!isModel && 'flex-row-reverse'}`}>
      {isModel ? <ModelIcon /> : <UserIcon />}
      <div className={`flex flex-col ${isModel ? 'items-start' : 'items-end'}`}>
        <div className={`max-w-2xl p-4 rounded-2xl ${isModel ? 'bg-white dark:bg-gray-800 shadow-sm' : 'bg-blue-500 text-white'}`}>
          {isLoading ? (
            <LoadingSpinner />
          ) : (
            <FormattedMessage text={message.text} />
          )}
        </div>
        {message.sources && message.sources.length > 0 && (
          <div className="mt-3">
            <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">Surse:</h4>
            <div className="flex flex-wrap gap-2">
              {message.sources.map((source, index) => (
                <SourceLink key={index} source={source} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatMessage;