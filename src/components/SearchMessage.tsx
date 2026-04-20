
import React from 'react';
import { SearchContent } from '../types';

interface SearchMessageProps {
  content: SearchContent;
  onCreateFlashcards?: (text: string) => void;
}

const SearchMessage: React.FC<SearchMessageProps> = ({ content, onCreateFlashcards }) => {
  const formattedContent = content.text.split('**').map((part, index) =>
    index % 2 === 1 ? <strong key={index} className="text-blue-900 font-bold">{part}</strong> : part
  );

  return (
    <div className="space-y-4">
      <div className="text-sm md:text-base whitespace-pre-wrap text-gray-900">
        {formattedContent}
      </div>
      
      {content.sources && content.sources.length > 0 && (
          <div className="mt-4 pt-3 border-t border-gray-100">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Fuentes verificadas:</p>
              <div className="flex flex-wrap gap-2">
                  {content.sources.map((source, idx) => (
                      <a 
                          key={idx} 
                          href={source.uri} 
                          target="_blank" 
                          rel="noreferrer"
                          className="text-[11px] bg-gray-50 text-blue-900 px-3 py-1 rounded-full border border-blue-900/10 hover:bg-blue-50 transition-colors font-medium"
                      >
                          {source.title}
                      </a>
                  ))}
              </div>
          </div>
      )}

      {onCreateFlashcards && (
          <div className="pt-2">
             <button
                onClick={() => onCreateFlashcards(content.text)}
                className="flex items-center gap-2 px-4 py-2 bg-blue-900 text-white rounded-lg hover:bg-blue-800 transition-colors text-sm font-semibold shadow-sm"
             >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
                ✨ Crear Tarjetas de Estudio
             </button>
          </div>
      )}
    </div>
  );
};

export default SearchMessage;
