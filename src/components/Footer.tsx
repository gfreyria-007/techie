
import React from 'react';

interface FooterProps {
  sessionTokensUsed: number;
  onLogout?: () => void;
}

const Footer: React.FC<FooterProps> = ({ sessionTokensUsed, onLogout }) => {
  return (
    <footer className="bg-[#f8fafc] p-3 text-center text-xs text-gray-500 border-t border-gray-200">
      <div className="max-w-4xl mx-auto">
        <p className="mb-1">
          <strong>Aviso:</strong> Techie es una IA experimental; úsala como guía. Tus datos no se guardan.
          {' '}
          <a href="#" onClick={(e) => { e.preventDefault(); window.location.reload(); }} className="font-semibold text-blue-600 hover:underline">
            Reiniciar sesión
          </a>.
        </p>
        <p className="mb-1">
          &copy; {new Date().getFullYear()} Catalizia.com.
        </p>
        <p className="font-mono text-gray-300 text-[10px] mb-2">
            Tokens: {sessionTokensUsed}
        </p>
        {onLogout && (
          <button 
            onClick={onLogout}
            className="px-6 py-2 bg-red-500 hover:bg-red-600 text-white text-[10px] font-black uppercase tracking-widest rounded-full transition-all active:scale-95 shadow-lg shadow-red-500/20"
          >
            Cerrar Sesión / Salir
          </button>
        )}
      </div>
    </footer>
  );
};

export default Footer;
