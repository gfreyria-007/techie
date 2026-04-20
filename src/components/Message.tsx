
import React, { useRef, useState } from 'react';
import { ChatMessage, Role, QuizOption, QuizResultContent } from '../types';
import QuizMessage from './QuizMessage';
import ReviewMessage from './ReviewMessage';
import ReviewAllMessage from './ReviewAllMessage';
import SelectionMessage from './SelectionMessage';
import SearchMessage from './SearchMessage';
import FullQuizMessage from './FullQuizMessage';
import QuizReportMessage from './QuizReportMessage';
import MathVivaMessage from './MathVivaMessage';

interface MessageProps {
  message: ChatMessage;
  onQuizAnswer: (question: string, option: QuizOption) => void;
  onSelection: (text: string) => void;
  onImageClick?: (url: string, prompt?: string) => void;
  onCreateFlashcards?: (text: string) => void;
  onEditImage?: (url: string) => void;
  onQuizFinished?: (result: QuizResultContent) => void;
}

const Message: React.FC<MessageProps> = ({ message, onQuizAnswer, onSelection, onImageClick, onCreateFlashcards, onEditImage, onQuizFinished }) => {
  const isUser = message.role === Role.USER;
  const isModel = message.role === 'model';
  const isSystem = message.role === Role.SYSTEM;

  const renderMarkdown = (text: string) => {
    return text.split('\n').map((line, i) => {
        const formatted = line.split('**').map((part, index) =>
            index % 2 === 1 ? <strong key={index} className="text-[#1e3a8a] font-bold">{part}</strong> : part
        );
        if (line.startsWith('###')) return <h3 key={i} className="text-lg font-black text-[#1e3a8a] mt-4 mb-2 uppercase tracking-tight">{formatted}</h3>;
        if (line.startsWith('##')) return <h2 key={i} className="text-xl font-black text-[#1e3a8a] mt-6 mb-3 uppercase tracking-tighter border-b border-gray-100 pb-2">{formatted}</h2>;
        
        return <p key={i} className="mb-2 leading-relaxed">{formatted}</p>;
    });
  };

  if (isSystem) {
    return (
        <div className="flex justify-center my-8 animate-fade-in">
            <div className="bg-white border border-gray-100 px-6 py-2 rounded-full shadow-sm flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-blue-400 animate-pulse"></div>
                <span className="text-[10px] font-black text-blue-900/40 uppercase tracking-[0.3em] whitespace-nowrap">
                    {typeof message.content === 'string' ? message.content : 'Notificación de Sistema'}
                </span>
            </div>
        </div>
    );
  }

  const renderContent = () => {
    const { content, sources } = message;
    
    let mainContent: React.ReactNode;

    if (typeof content === 'string') {
      mainContent = <div className="text-sm md:text-base whitespace-pre-wrap">{renderMarkdown(content)}</div>;
    } else if (content.type === 'image') {
      mainContent = (
        <div className="mt-2 group cursor-pointer relative inline-block" onClick={() => onImageClick?.(content.url, content.prompt)}>
          <img src={content.url} alt="IA Content" className="max-w-[250px] rounded-lg border border-gray-200" referrerPolicy="no-referrer" />
        </div>
      );
    } else if (content.type === 'deep-research') {
        mainContent = (
            <div className="bg-white border border-gray-100 rounded-xl overflow-hidden shadow-sm">
                <div className="bg-blue-900 p-4 text-white">
                    <span className="text-[10px] font-black uppercase tracking-[0.3em] opacity-60">Reporte de Investigación</span>
                    <h2 className="text-xl font-black uppercase tracking-tighter mt-1">{content.topic}</h2>
                </div>
                <div className="p-5 md:p-8 text-gray-800 bg-white">
                    {renderMarkdown(content.markdownReport)}
                </div>
            </div>
        );
    } else if (content.type === 'math-viva') mainContent = <MathVivaMessage content={content} onAction={onSelection} />;
    else if (content.type === 'quiz') mainContent = <QuizMessage content={content} onAnswer={onQuizAnswer} />;
    else if (content.type === 'review') mainContent = <ReviewMessage content={content} />;
    else if (content.type === 'review-all') mainContent = <ReviewAllMessage content={content} />;
    else if (content.type === 'selection') mainContent = <SelectionMessage content={content} onSelect={onSelection} />;
    else if (content.type === 'full-quiz') mainContent = <FullQuizMessage content={content} onFinish={onQuizFinished!} />;
    else if (content.type === 'quiz-result') mainContent = <QuizReportMessage content={content} />;
    else mainContent = null;

    return (
        <div className="space-y-3 w-full">
            {mainContent}
            {isModel && sources && sources.length > 0 && (
                <div className="mt-3 pt-3 border-t border-gray-100">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Fuentes Consultadas:</p>
                    <div className="flex flex-wrap gap-2">
                        {sources.map((s, idx) => (
                            <a key={idx} href={s.uri} target="_blank" rel="noreferrer" className="text-[10px] bg-gray-50 text-[#1e3a8a] px-2 py-1 rounded border border-gray-200 hover:bg-white transition-colors truncate max-w-[200px]">
                                {s.title}
                            </a>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
  };

  return (
    <div className={`flex items-start gap-3 my-4 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
      {!isUser && (
        <img src="https://catalizia.com/images/catalizia-techie.png" alt="Techie" className="w-8 h-8 rounded-full border border-gray-100 bg-white shrink-0" referrerPolicy="no-referrer" />
      )}
      <div className={`max-w-[90%] md:max-w-[85%] p-3 md:p-4 rounded-2xl shadow-sm ${
          isUser 
            ? 'bg-[#1e3a8a] text-white rounded-br-none' 
            : 'bg-white border border-gray-100 text-gray-900 rounded-bl-none'
        } ${message.content.type === 'deep-research' || message.content.type === 'math-viva' ? 'w-full !p-0 overflow-hidden' : ''}`}>
        {renderContent()}
      </div>
    </div>
  );
};

export default Message;
