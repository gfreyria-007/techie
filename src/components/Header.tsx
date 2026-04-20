
import React from 'react';

interface HeaderProps {
  onResetProfile?: () => void;
  onIncreaseFont: () => void;
  onDecreaseFont: () => void;
  canIncrease: boolean;
  canDecrease: boolean;
  isAdmin?: boolean;
  onOpenAdmin?: () => void;
  onLogout?: () => void;
}

const Header: React.FC<HeaderProps> = ({ 
  onResetProfile, onIncreaseFont, onDecreaseFont, canIncrease, canDecrease,
  isAdmin, onOpenAdmin, onLogout
}) => {
  return (
    <header className="bg-white p-2 sm:p-4 shadow-md border-b border-gray-100 sticky top-0 z-40 flex items-center justify-between">
      <div className="flex items-center space-x-2 sm:space-x-4">
        <div className="flex flex-col items-start cursor-pointer" onClick={onResetProfile} title="Reiniciar">
            <img 
                src="https://catalizia.com/wp-content/uploads/2024/05/cropped-CatalizIA-logo-horizontal-sin-dot-com-scaled-1-313x100.png" 
                alt="Catalizia" 
                className="h-8 sm:h-10 w-auto object-contain"
                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
            />
        </div>
        
        <div className="w-px h-8 bg-gray-100"></div>
        
        <div className="flex items-center space-x-2">
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-white rounded-full flex items-center justify-center overflow-hidden border border-blue-100 shadow-sm">
                <img 
                    src="https://catalizia.com/images/catalizia-techie.png" 
                    alt="Techie Mascot" 
                    className="w-full h-full object-contain"
                />
            </div>
            <h1 className="text-sm sm:text-lg font-black text-blue-900 hidden sm:block uppercase tracking-tighter">
              <span>TECHIE</span>
              <span className="text-gray-400 ml-1">TUTOR AI</span>
            </h1>
        </div>
      </div>

      <div className="flex items-center bg-gray-50 rounded-2xl p-1.5 border border-gray-200 shadow-sm gap-1">
        {isAdmin && (
          <button 
            onClick={onOpenAdmin}
            className="p-2 hover:bg-white text-purple-700 rounded-xl transition-all flex items-center gap-2"
            title="Panel de Administración"
          >
            <span className="text-lg">⚙️</span>
            <span className="text-[10px] font-black uppercase tracking-widest hidden sm:block">Admin</span>
          </button>
        )}
        
        {isAdmin && onLogout && <div className="w-px h-6 bg-gray-200 mx-1"></div>}

        {onLogout && (
          <button 
            onClick={onLogout}
            className="p-2 hover:bg-white text-red-600 rounded-xl transition-all flex items-center gap-2"
            title="Cerrar Sesión"
          >
            <span className="text-lg">🚪</span>
            <span className="text-[10px] font-black uppercase tracking-widest hidden sm:block">Salir</span>
          </button>
        )}

        <div className="w-px h-6 bg-gray-200 mx-1"></div>

        <div className="flex items-center">
          <button 
              onClick={onDecreaseFont}
              disabled={!canDecrease}
              className={`p-2 rounded-xl transition-colors flex items-center justify-center min-w-[36px] ${!canDecrease ? 'text-gray-300 cursor-not-allowed' : 'text-blue-900 hover:bg-white shadow-sm'}`}
              title="Reducir tamaño de letra"
          >
              <span className="text-xs font-black">A-</span>
          </button>
          <div className="w-px h-4 bg-gray-200 mx-1"></div>
          <button 
              onClick={onIncreaseFont}
              disabled={!canIncrease}
              className={`p-2 rounded-xl transition-colors flex items-center justify-center min-w-[36px] ${!canIncrease ? 'text-gray-300 cursor-not-allowed' : 'text-blue-900 hover:bg-white shadow-sm'}`}
              title="Aumentar tamaño de letra"
          >
              <span className="text-lg font-black leading-none">A+</span>
          </button>
        </div>
      </div>
    </header>
  );
};

export default Header;
