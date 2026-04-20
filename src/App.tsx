
import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import Footer from './components/Footer';
import GradeSelector from './components/GradeSelector';
import ChatWindow from './components/ChatWindow';
import ChatInput from './components/ChatInput';
import UserProfileSetup from './components/UserProfileSetup';
import ImageCreationModal from './components/ImageCreationModal';
import ImagePopup from './components/ImagePopup';
import FlashcardModal from './components/FlashcardModal';
import AccessRequestModal from './components/AccessRequestModal';
import AdminDashboard from './components/AdminDashboard';
import { 
  auth, db, googleProvider, appleProvider, signInWithPopup, signOut, onAuthStateChanged, 
  doc, getDoc, setDoc, updateDoc, onSnapshot, FirebaseUser,
  collection, query, where, getDocs
} from './firebase';

import { 
  Role, Grade, ChatMode, ChatMessage, ExplorerSettings, 
  ImageContent, QuizResultContent, Flashcard,
  AspectRatio, ImageSize, ImageStyle, LightingStyle, SearchSource, UserProfile
} from './types';
import { TOOL_DEFINITIONS, GRADES } from './constants';
import * as geminiService from './services/geminiService';
import { fileToGenerativePart } from './utils/audio';
import { motion, AnimatePresence } from 'framer-motion';

const MathSubmenu: React.FC<{ onAction: (p: string) => void }> = ({ onAction }) => {
  const [showTables, setShowTables] = useState(false);
  const menuItems = [
    { label: 'Sumas', icon: '+', prompt: 'Enséñame a sumar con un ejemplo visual de frutas' },
    { label: 'Restas', icon: '-', prompt: 'Enséñame a restar con un ejemplo visual de manzanas' },
    { label: 'Multiplicar', icon: '×', prompt: 'Enséñame a multiplicar con un ejemplo visual de bloques' },
    { label: 'Dividir', icon: '÷', prompt: 'Enséñame a dividir con un ejemplo visual de agrupamiento' },
    { label: 'Raíz', icon: '√', prompt: 'Enséñame la raíz cuadrada con un ejemplo visual de un cuadrado de bloques' },
    { label: 'Tablas', icon: '▤', action: () => setShowTables(!showTables) },
  ];

  return (
    <div className="bg-[#1e3a8a] p-3 z-20 shadow-lg sticky top-0 flex flex-col gap-2 transition-all">
      <div className="overflow-x-auto whitespace-nowrap scrollbar-hide flex gap-2">
        {menuItems.map((item, i) => (
          <button 
            key={i}
            onClick={() => item.action ? item.action() : onAction(item.prompt)}
            className={`px-4 py-2 rounded-xl flex items-center gap-2 transition-all active:scale-95 text-white ${item.label === 'Tablas' && showTables ? 'bg-white/30 ring-1 ring-white/50' : 'bg-white/10 hover:bg-white/20 border border-white/10'}`}
          >
            <span className="font-black text-blue-300 text-sm">{item.icon}</span>
            <span className="text-[10px] font-black uppercase tracking-wider">{item.label}</span>
          </button>
        ))}
      </div>
      
      {showTables && (
        <div className="flex flex-wrap gap-2 pt-2 border-t border-white/10 animate-fade-in">
          {Array.from({ length: 13 }, (_, i) => i + 1).map(n => (
            <button 
              key={n} 
              onClick={() => { onAction(`Enséñame la tabla del ${n} con bloques visuales`); setShowTables(false); }}
              className="w-10 h-10 rounded-lg bg-white/10 hover:bg-white/30 text-white font-black text-xs border border-white/10 transition-colors"
            >
              {n}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [isProfileLoading, setIsProfileLoading] = useState(false);
  const [showAdminDashboard, setShowAdminDashboard] = useState(false);

  const [userName, setUserName] = useState<string | null>(null);
  const [userAge, setUserAge] = useState<number | null>(null);
  const [selectedGrade, setSelectedGrade] = useState<Grade | null>(null);

  const [chatMode, setChatMode] = useState<ChatMode>('default');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [isStudioLoading, setIsStudioLoading] = useState(false);
  const [loadingText, setLoadingText] = useState<string | undefined>(undefined);
  const [sessionTokensUsed, setSessionTokensUsed] = useState(0);
  
  const [explorerSettings, setExplorerSettings] = useState<ExplorerSettings>({ temperature: 0.7, persona: null });
  const [studioHistory, setStudioHistory] = useState<ImageContent[]>([]);
  const [flashcards, setFlashcards] = useState<Flashcard[]>([]);

  const [showImageCreationModal, setShowImageCreationModal] = useState(false);
  const [imageCreationFile, setImageCreationFile] = useState<File | null>(null);
  const [imageCreationUrl, setImageCreationUrl] = useState<string | null>(null);
  const [showImagePopup, setShowImagePopup] = useState(false);
  const [popupImage, setPopupImage] = useState<string | null>(null);
  const [popupPrompt, setPopupPrompt] = useState<string | undefined>(undefined);
  const [showFlashcards, setShowFlashcards] = useState(false);
  const [fontScale, setFontScale] = useState(1);

  useEffect(() => {
    document.documentElement.style.fontSize = `${fontScale * 100}%`;
  }, [fontScale]);

  useEffect(() => {
    if (!currentUser) {
      setUserProfile(null);
      return;
    }

    const unsubscribe = onSnapshot(doc(db, 'users', currentUser.uid), (doc) => {
      if (doc.exists()) {
        const data = doc.data() as UserProfile;
        setUserProfile(data);
        setUserName(data.name || null);
        if (data.age) setUserAge(data.age);
        if (data.gradeId) {
          const savedGrade = GRADES.find(g => g.id === data.gradeId);
          if (savedGrade) setSelectedGrade(savedGrade);
        }
      } else {
        setUserProfile(null);
      }
    });

    return () => unsubscribe();
  }, [currentUser]);

  useEffect(() => {
    console.log('Auth Listener Initializing...');
    if (auth.currentUser) {
      console.log('User already present on mount:', auth.currentUser.email);
      setCurrentUser(auth.currentUser);
      loadUserProfile(auth.currentUser);
    }
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      console.log('Auth State Changed:', user ? `User: ${user.email}` : 'No User');
      setCurrentUser(user);
      if (user) {
        setIsProfileLoading(true);
        await loadUserProfile(user);
        setIsProfileLoading(false);
      } else {
        setUserProfile(null);
        setIsProfileLoading(false);
      }
      setIsAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const loadUserProfile = async (user: FirebaseUser) => {
    console.log('Loading profile for:', user.uid);
    if (!user.uid) return;

    try {
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      console.log('Profile Doc Exists:', userDoc.exists());
      
      if (userDoc.exists()) {
        const data = userDoc.data() as UserProfile;
        
        // Force admin approval if needed
        if (user.email === 'gfreyria@gmail.com' && (!data.isApproved || data.role !== 'admin')) {
          await updateDoc(doc(db, 'users', user.uid), {
            isApproved: true,
            role: 'admin'
          });
          data.isApproved = true;
          data.role = 'admin';
        }

        // Reset daily usage if it's a new day
        const today = new Date().toISOString().split('T')[0];
        if (data.lastUsageDate !== today) {
          await updateDoc(doc(db, 'users', user.uid), {
            dailyUsageCount: 0,
            lastUsageDate: today
          });
          data.dailyUsageCount = 0;
          data.lastUsageDate = today;
        }

        setUserProfile(data);
        setUserName(data.name);
        if (data.age) setUserAge(data.age);
        if (data.gradeId) {
          const savedGrade = GRADES.find(g => g.id === data.gradeId);
          if (savedGrade) setSelectedGrade(savedGrade);
        }
      } else {
        // Check if there's an approved access request for this email
        let isApproved = user.email === 'gfreyria@gmail.com';
        
        if (!isApproved && user.email) {
          try {
            const q = query(
              collection(db, 'access_requests'), 
              where('email', '==', user.email), 
              where('status', '==', 'approved')
            );
            const querySnapshot = await getDocs(q);
            if (!querySnapshot.empty) {
              isApproved = true;
            }
          } catch (error) {
            console.error('Error checking access requests:', error);
          }
        }

        const newProfile: UserProfile = {
          uid: user.uid,
          email: user.email || '',
          name: user.displayName || 'Estudiante',
          role: user.email === 'gfreyria@gmail.com' ? 'admin' : 'user',
          isApproved: isApproved,
          tokensPerDay: 100,
          dailyUsageCount: 0,
          lastUsageDate: new Date().toISOString().split('T')[0]
        };
        await setDoc(doc(db, 'users', user.uid), newProfile);
        setUserProfile(newProfile);
        setUserName(newProfile.name);
      }
    } catch (error) {
      console.error('Error loading user profile:', error);
    }
  };

  const handleLogin = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      console.error('Login error:', error);
    }
  };

  const handleAppleLogin = async () => {
    try {
      await signInWithPopup(auth, appleProvider);
    } catch (error) {
      console.error('Apple login error:', error);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setUserName(null);
      setSelectedGrade(null);
      setMessages([]);
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  useEffect(() => {
    if (selectedGrade && userName && messages.length === 0) {
      handleSendMessage("¡Hola!");
    }
  }, [selectedGrade, userName]);

  const getSimplifiedHistory = (msgs: ChatMessage[]) => {
    return msgs
      .filter(m => m.role !== Role.SYSTEM)
      .slice(-20) 
      .map(m => ({
          role: m.role === Role.MODEL ? 'model' : 'user',
          parts: [{ text: typeof m.content === 'string' ? m.content : JSON.stringify(m.content) }]
      }));
  };

  const handleModeChange = (newMode: ChatMode) => {
    if (newMode === chatMode) return;
    
    setChatMode(newMode);
    const tool = TOOL_DEFINITIONS.find(t => t.id === newMode);
    if (tool) {
        addMessage(Role.SYSTEM, `HERRAMIENTA ACTIVADA: ${tool.title.toUpperCase()}`);
    }

    if (newMode === 'image-studio') {
        setShowImageCreationModal(true);
    }
  };

  const handleProfileSubmit = async (name: string, age: number, grade: Grade, mode: ChatMode) => {
    setUserName(name); setUserAge(age); setSelectedGrade(grade); setChatMode(mode);
    
    // Persist to Firestore
    if (currentUser?.uid) {
      try {
        await setDoc(doc(db, 'users', currentUser.uid), {
          name,
          age,
          gradeId: grade.id
        }, { merge: true });
        setUserProfile(prev => prev ? { ...prev, name, age, gradeId: grade.id } : null);
      } catch (error) {
        console.error('Error saving profile data:', error);
      }
    }

    if (mode === 'image-studio') setShowImageCreationModal(true);
    else {
        const toolTitle = TOOL_DEFINITIONS.find(t=>t.id===mode)?.title || "Tutor Socrático";
        addMessage(Role.MODEL, `¡Hola ${name}! Soy tu **${toolTitle}**. ¿En qué puedo ayudarte?`);
    }
  };

  const handleResetProfile = () => {
    setUserName(null); setUserAge(null); setSelectedGrade(null); setMessages([]);
    setChatMode('default');
  };

  const addMessage = (role: Role, content: any, sources?: SearchSource[]) => {
      setMessages(prev => [...prev, { role, content, timestamp: Date.now(), sources }]);
  };

  const handleSendMessage = async (text: string, file?: File, isReviewMode?: boolean, quizCount?: number) => {
      if (!selectedGrade || !userProfile) return;

      // Check usage limits
      if (userProfile.role !== 'admin' && userProfile.dailyUsageCount >= userProfile.tokensPerDay) {
          addMessage(Role.MODEL, "¡Ups! Has alcanzado tu límite de mensajes por hoy. Vuelve mañana para seguir aprendiendo con Techie. 🚀");
          return;
      }

      // Special handling for image studio mode with file attachment
      if (chatMode === 'image-studio' && file) {
          setImageCreationFile(file);
          setShowImageCreationModal(true);
          return;
      }

      const isInitialGreeting = text === "¡Hola!";

      if (!isInitialGreeting) {
          if (file) {
              const reader = new FileReader();
              reader.onload = (e) => addMessage(Role.USER, { type: 'image', url: e.target?.result as string, prompt: text || 'Imagen' });
              reader.readAsDataURL(file);
          } else addMessage(Role.USER, text);
      }

      setIsChatLoading(true);
      
      if (file && isReviewMode) setLoadingText("Revisando y evaluando tu tarea...");
      else if (file) setLoadingText("Observando y analizando la imagen...");
      else if (chatMode === 'researcher') setLoadingText("Investigando y redactando reporte...");
      else if (chatMode === 'quiz-master') setLoadingText("Diseñando un examen...");
      else if (chatMode === 'explorer') setLoadingText("Buscando en la web...");
      else if (chatMode === 'math-viva') setLoadingText("Activando Math Engine v5.2...");
      else setLoadingText("Techie está pensando...");
      
      try {
          let response: any;
          const history = getSimplifiedHistory([...messages, { role: Role.USER, content: text, timestamp: Date.now() }]);

          if (chatMode === 'quiz-master' && !isInitialGreeting) {
              const quizQuestions = await geminiService.generateTopicQuiz(text, selectedGrade, quizCount || 5);
              addMessage(Role.MODEL, { type: 'full-quiz', topic: text, questions: quizQuestions });
              setIsChatLoading(false); return;
          }

          if (isReviewMode && file) {
             response = await geminiService.reviewHomework(await fileToGenerativePart(file), text, selectedGrade, userName, userAge);
          } else if (file) {
             response = await geminiService.analyzeImage(await fileToGenerativePart(file), text, selectedGrade, userName, userAge, history, chatMode);
          } else if (chatMode === 'researcher' && !isInitialGreeting) {
             response = await geminiService.getDeepResearchResponse(text, selectedGrade, userName, userAge);
          } else {
             response = await geminiService.getChatResponse(history, selectedGrade, userName, userAge, chatMode, explorerSettings.temperature, explorerSettings.persona, explorerSettings.customSystemInstruction || '');
          }

          if (response && response.text) {
              const sources: SearchSource[] = [];
              const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
              if (chunks) {
                  chunks.forEach((chunk: any) => {
                      if (chunk.web) sources.push({ title: chunk.web.title, uri: chunk.web.uri });
                  });
              }

              if (chatMode === 'researcher' && !isInitialGreeting) {
                  addMessage(Role.MODEL, { type: 'deep-research', topic: text, markdownReport: response.text }, sources);
              } else {
                  try {
                      const parsed = JSON.parse(geminiService.cleanJsonString(response.text));
                      addMessage(Role.MODEL, parsed, sources);
                  } catch (e) {
                      addMessage(Role.MODEL, response.text, sources);
                  }
              }

              // Update usage count
              if (!isInitialGreeting && userProfile.uid) {
                  const newCount = userProfile.dailyUsageCount + 1;
                  await updateDoc(doc(db, 'users', userProfile.uid), {
                      dailyUsageCount: newCount
                  });
                  setUserProfile(prev => prev ? { ...prev, dailyUsageCount: newCount } : null);
              }
          }
      } catch (error: any) {
          addMessage(Role.MODEL, "Hubo un problema al conectar con la biblioteca. Inténtalo de nuevo.");
      } finally {
          setIsChatLoading(false);
          setLoadingText(undefined);
      }
  };

  console.log('Admin Status:', { 
    email: currentUser?.email, 
    role: userProfile?.role, 
    isAdmin: userProfile?.role === 'admin' || currentUser?.email === 'gfreyria@gmail.com',
    showAdmin: showAdminDashboard 
  });

  if (isAuthLoading || isProfileLoading) {
    return (
      <div className="h-screen w-screen bg-[#1e3a8a] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-blue-400 border-t-white rounded-full animate-spin"></div>
          <p className="text-blue-200 text-[10px] font-black uppercase tracking-[0.3em] animate-pulse">Cargando Techie...</p>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div className="h-screen w-screen bg-[#0F172A] flex flex-col items-center justify-center p-6 text-center relative overflow-hidden font-sans">
        {/* Animated Background Accents */}
        <div className="absolute -top-24 -right-24 w-[30rem] h-[30rem] bg-indigo-600/20 rounded-full blur-[120px] animate-pulse"></div>
        <div className="absolute -bottom-24 -left-24 w-[30rem] h-[30rem] bg-blue-600/20 rounded-full blur-[120px] animate-pulse" style={{ animationDelay: '2s' }}></div>
        
        <div className="relative z-10 flex flex-col items-center max-w-lg w-full">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5 }}
              className="mb-12 flex flex-col items-center"
            >
                <img 
                  src="https://catalizia.com/wp-content/uploads/2024/05/cropped-CatalizIA-logo-horizontal-sin-dot-com-scaled-1-313x100.png" 
                  alt="Catalizia" 
                  className="h-12 w-auto object-contain mb-3 brightness-0 invert opacity-90"
                />
                <p className="text-indigo-400 text-[10px] font-black tracking-[0.6em] uppercase">Intelligence for Education</p>
            </motion.div>

            <motion.div 
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.2, duration: 0.6 }}
              className="w-40 h-40 bg-white/5 backdrop-blur-xl border border-white/10 rounded-[3rem] flex items-center justify-center mb-10 p-6 relative group"
            >
              <div className="absolute inset-0 bg-gradient-to-tr from-indigo-500/20 to-blue-500/20 rounded-[3rem] opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <img src="https://catalizia.com/images/catalizia-techie.png" alt="Techie" className="w-full h-full object-contain relative z-10 drop-shadow-2xl" />
            </motion.div>

            <motion.h1 
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.3, duration: 0.6 }}
              className="text-5xl md:text-6xl font-black text-white mb-4 uppercase tracking-tighter font-display"
            >
              Techie <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-400">Tutor</span>
            </motion.h1>
            
            <motion.p 
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.4, duration: 0.6 }}
              className="text-slate-400 mb-12 text-lg font-medium leading-relaxed max-w-sm"
            >
              Your personal AI-powered learning assistant for the digital age.
            </motion.p>

            <motion.div 
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.5, duration: 0.6 }}
              className="flex flex-col gap-5 w-full max-w-xs"
            >
              <button 
                onClick={handleLogin}
                className="w-full bg-white text-slate-900 px-8 py-5 rounded-[2.5rem] font-black uppercase tracking-widest shadow-2xl hover:bg-slate-50 transition-all active:scale-95 flex items-center justify-center gap-4 group"
              >
                <div className="bg-white p-1 rounded-full shadow-md group-hover:scale-110 transition-transform">
                  <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" className="w-7 h-7" alt="Google" />
                </div>
                <span className="text-sm">Enter with Google</span>
              </button>

              <button 
                onClick={handleAppleLogin}
                className="w-full bg-slate-800 text-white px-8 py-5 rounded-[2.5rem] font-black uppercase tracking-widest shadow-2xl border border-slate-700 hover:bg-slate-700 transition-all active:scale-95 flex items-center justify-center gap-4 group"
              >
                <div className="bg-white p-1 rounded-full shadow-md group-hover:scale-110 transition-transform flex items-center justify-center">
                  <svg viewBox="0 0 384 512" className="w-6 h-6 fill-black"><path d="M318.7 268.7c-.2-36.7 16.4-64.4 50-84.8-18.8-26.9-47.2-41.7-84.7-44.6-35.5-2.8-74.3 20.7-88.5 20.7-15 0-49.4-19.7-76.4-19.7C63.3 141.2 4 184.8 4 273.5q0 39.3 14.4 81.2c12.8 36.7 59 126.7 107.2 125.2 25.2-.6 43-17.9 75.8-17.9 31.8 0 48.3 17.9 76.4 17.9 48.6-.7 90.4-82.5 102.6-119.3-65.2-30.7-61.7-90-61.7-91.9zm-56.6-164.2c27.3-32.4 24.8-61.9 24-72.5-24.1 1.4-52 16.4-67.9 34.9-17.5 19.8-27.8 44.3-25.6 71.9 26.1 2 49.9-11.4 69.5-34.3z"/></svg>
                </div>
                <span className="text-sm">Enter with Apple</span>
              </button>
            </motion.div>

            <motion.p 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1, duration: 1 }}
              className="mt-16 text-[10px] text-slate-500 font-black uppercase tracking-[0.5em]"
            >
              © 2026 CatalizIA Education
            </motion.p>
        </div>
      </div>
    );
  }

  const isAdmin = currentUser?.email === 'gfreyria@gmail.com' || userProfile?.role === 'admin';

  return (
    <div className="flex flex-col min-h-screen bg-white text-[#1e3a8a] font-sans">
        <Header 
          onResetProfile={handleResetProfile} 
          onIncreaseFont={() => setFontScale(p => Math.min(p+0.1, 1.3))} 
          onDecreaseFont={() => setFontScale(p => Math.max(p-0.1, 0.9))} 
          canIncrease={fontScale < 1.3} 
          canDecrease={fontScale > 0.9}
          isAdmin={isAdmin}
          onOpenAdmin={() => { console.log('Opening Admin from Header'); setShowAdminDashboard(true); }}
          onLogout={handleLogout}
        />

        <main className="flex-1 flex flex-col relative">
          {!isAdmin && !userProfile?.isApproved ? (
            <AccessRequestModal 
              user={currentUser} 
              onLogout={handleLogout} 
              onOpenAdmin={() => setShowAdminDashboard(true)} 
            />
          ) : !userName || !selectedGrade ? (
            <UserProfileSetup 
              onProfileSubmit={handleProfileSubmit} 
              initialData={userName ? {name: userName, age: userAge || 0} : undefined} 
              initialGrade={selectedGrade} 
              isAdmin={isAdmin}
              onOpenAdmin={() => { console.log('Opening Admin from UserProfileSetup'); setShowAdminDashboard(true); }}
            />
          ) : (
            <>
              <GradeSelector selectedGrade={selectedGrade} activeTool={TOOL_DEFINITIONS.find(t => t.id === chatMode)} onGradeChange={setSelectedGrade} />
              
              {chatMode === 'math-viva' && <MathSubmenu onAction={(p) => handleSendMessage(p)} />}

              <div className="flex-1 relative flex flex-col bg-white">
                  <ChatWindow messages={messages} isLoading={isChatLoading} loadingText={loadingText} onQuizAnswer={(q, o) => o.isCorrect && chatMode === 'default' && handleSendMessage(`Siguiente paso?`)} onSelection={(t) => handleSendMessage(t)} onImageClick={(u,p)=> { setPopupImage(u); setPopupPrompt(p); setShowImagePopup(true); }} onCreateFlashcards={async (t)=> { const cards = await geminiService.generateFlashcards(t); setFlashcards(cards); setShowFlashcards(true); }} onEditImage={(u) => { setImageCreationUrl(u); setShowImageCreationModal(true); setShowImagePopup(false); }} onQuizFinished={(res) => addMessage(Role.MODEL, res)} />
              </div>
              <ChatInput 
                onSendMessage={handleSendMessage} 
                onDefaultMode={() => handleModeChange('default')} 
                onExplorerMode={() => handleModeChange('explorer')} 
                onImageStudio={() => handleModeChange('image-studio')} 
                onDeepResearch={() => handleModeChange('researcher')} 
                onQuizMasterMode={() => handleModeChange('quiz-master')} 
                onMathVivaMode={() => handleModeChange('math-viva')} 
                chatMode={chatMode} 
                isLoading={isChatLoading} 
                explorerSettings={explorerSettings} 
                onUpdateExplorerSettings={setExplorerSettings} 
                selectedGrade={selectedGrade} 
                onLogout={handleLogout}
              />
              <Footer sessionTokensUsed={sessionTokensUsed} onLogout={handleLogout} />
            </>
          )}
        </main>
        
        <ImageCreationModal 
            isOpen={showImageCreationModal} 
            onClose={() => { setShowImageCreationModal(false); if(chatMode === 'image-studio') setChatMode('default'); setImageCreationFile(null); setImageCreationUrl(null); }}
            onGenerate={async (p, a, s, l, e, sz, src) => { 
                setIsStudioLoading(true); 
                try {
                    const res = await geminiService.generateImage(p, a, selectedGrade!, userName!, s, l, e, sz, src); 
                    if (res) { addMessage(Role.MODEL, { type: 'image', url: res.url, prompt: p }); setStudioHistory(prev => [{ type: 'image', url: res.url }, ...prev]); } 
                } catch(e: any) { addMessage(Role.MODEL, e.message); }
                setIsStudioLoading(false); 
            }}
            onEdit={async (s, p, m, style, system) => { 
                setIsStudioLoading(true); 
                try {
                    const url = await geminiService.editImage(s, p, selectedGrade!, m, style, system); 
                    if (url) { addMessage(Role.MODEL, { type: 'image', url, prompt: p }); setStudioHistory(prev => [{ type: 'image', url }, ...prev]); } 
                } catch(e: any) { addMessage(Role.MODEL, e.message); }
                setIsStudioLoading(false); 
            }}
            isLoading={isStudioLoading} initialEditFile={imageCreationFile} initialEditUrl={imageCreationUrl} history={studioHistory}
        />
        <ImagePopup isOpen={showImagePopup} imageUrl={popupImage} prompt={popupPrompt} onClose={() => setShowImagePopup(false)} onEdit={(u) => { setImageCreationUrl(u); setShowImageCreationModal(true); setShowImagePopup(false); }} />
        <FlashcardModal isOpen={showFlashcards} cards={flashcards} onClose={() => setShowFlashcards(false)} />
        
        {showAdminDashboard && <AdminDashboard onClose={() => setShowAdminDashboard(false)} />}
    </div>
  );
};

export default App;
