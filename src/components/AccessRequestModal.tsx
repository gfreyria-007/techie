import React, { useState } from 'react';
import { auth, signOut, db, collection, addDoc, serverTimestamp, query, where, getDocs } from '../firebase';
import { motion, AnimatePresence } from 'motion/react';

interface AccessRequestModalProps {
  user: any;
  onLogout: () => void;
  onOpenAdmin?: () => void;
}

const AccessRequestModal: React.FC<AccessRequestModalProps> = ({ user, onLogout, onOpenAdmin }) => {
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [requestStatus, setRequestStatus] = useState<'idle' | 'submitting' | 'success' | 'error' | 'already_exists'>('idle');

  const isAdminEmail = user?.email === 'gabsvpn@gmail.com';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.email) return;

    setIsSubmitting(true);
    setRequestStatus('submitting');

    try {
      // Check if request already exists
      const q = query(collection(db, 'access_requests'), where('email', '==', user.email), where('status', '==', 'pending'));
      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        setRequestStatus('already_exists');
        setIsSubmitting(false);
        return;
      }

      await addDoc(collection(db, 'access_requests'), {
        email: user.email,
        name: user.displayName || 'Usuario',
        message: message,
        status: 'pending',
        createdAt: serverTimestamp(),
      });

      setRequestStatus('success');
    } catch (error) {
      console.error('Error submitting access request:', error);
      setRequestStatus('error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex-1 flex items-center justify-center p-4 bg-slate-50">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="bg-white border border-gray-100 rounded-[3rem] p-8 sm:p-12 max-w-md w-full shadow-2xl relative overflow-hidden text-[#1e3a8a]"
      >
        {/* Background Accents */}
        <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-blue-500 via-indigo-500 to-blue-500"></div>
        
        <div className="relative z-10">
          <div className="flex flex-col items-center mb-8">
            <div className="w-24 h-24 bg-blue-50 rounded-full flex items-center justify-center border border-blue-100 shadow-inner mb-4">
              <span className="text-5xl">🚀</span>
            </div>
            <h2 className="text-3xl font-black text-[#1e3a8a] text-center uppercase tracking-tight">Registro de Acceso</h2>
            <p className="text-gray-400 text-center text-[10px] font-black uppercase tracking-widest mt-2">Super Tutor IA • CatalizIA</p>
          </div>

          <p className="text-gray-500 text-center text-sm mb-10 leading-relaxed">
            ¡Hola, <span className="text-[#1e3a8a] font-black">{user?.displayName || user?.email}</span>! 
            Techie es un tutor exclusivo. Por favor, completa tu registro para solicitar acceso.
          </p>

          {requestStatus === 'success' ? (
            <div className="text-center py-6 animate-fade-in">
              <div className="text-6xl mb-6">✅</div>
              <h3 className="text-2xl font-black text-[#1e3a8a] mb-3 uppercase tracking-tight">¡Solicitud Enviada!</h3>
              <p className="text-gray-400 text-sm mb-8 font-bold uppercase tracking-wide">Tu solicitud está pendiente de aprobación. Te avisaremos pronto por correo.</p>
              <div className="p-4 bg-blue-50 rounded-2xl border border-blue-100">
                <p className="text-[10px] font-black text-[#1e3a8a] uppercase tracking-widest">Estado: Pendiente de Revisión</p>
              </div>
            </div>
          ) : requestStatus === 'already_exists' ? (
            <div className="text-center py-6 animate-fade-in">
              <div className="text-6xl mb-6">⏳</div>
              <h3 className="text-2xl font-black text-[#1e3a8a] mb-3 uppercase tracking-tight">Solicitud en Espera</h3>
              <p className="text-gray-400 text-sm mb-8 font-bold uppercase tracking-wide">Ya tienes una solicitud activa. ¡Estamos revisándola para darte acceso lo antes posible!</p>
              <div className="p-4 bg-amber-50 rounded-2xl border border-amber-100">
                <p className="text-[10px] font-black text-amber-700 uppercase tracking-widest">Pronto recibirás noticias nuestras</p>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-4">¿Por qué quieres usar Techie? (Opcional)</label>
                <textarea 
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Cuéntanos un poco sobre ti..."
                  className="w-full bg-gray-50 border-2 border-transparent rounded-[2rem] p-6 text-[#1e3a8a] placeholder:text-gray-300 focus:outline-none focus:ring-4 focus:ring-blue-50 focus:border-[#1e3a8a] min-h-[120px] resize-none transition-all text-sm font-bold"
                />
              </div>

              {requestStatus === 'error' && (
                <p className="text-red-500 text-[10px] font-black text-center uppercase tracking-widest animate-pulse">Ocurrió un error. Inténtalo de nuevo.</p>
              )}

              <button 
                type="submit"
                disabled={isSubmitting}
                className="w-full py-6 bg-[#1e3a8a] hover:bg-black disabled:bg-gray-200 text-white font-black rounded-[2rem] shadow-xl transition-all active:scale-95 flex items-center justify-center gap-3 uppercase tracking-[0.2em] text-lg"
              >
                {isSubmitting ? (
                  <div className="w-6 h-6 border-3 border-white/30 border-t-white rounded-full animate-spin"></div>
                ) : (
                  <>Enviar Solicitud <span className="text-2xl">✨</span></>
                )}
              </button>

              <p className="text-[9px] text-gray-300 text-center font-black uppercase tracking-[0.4em] mt-8">
                Al solicitar acceso aceptas nuestros términos de uso
              </p>
            </form>
          )}
        </div>
      </motion.div>
    </div>
  );
};

export default AccessRequestModal;
