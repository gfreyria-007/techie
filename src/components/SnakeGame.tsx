import React, { useState, useEffect, useCallback, useRef } from 'react';
import * as gameAudio from '../utils/gameAudio';

// --- Constants ---
const BOARD_SIZE = 20;
const MAX_LEVEL = 30;
const POINTS_PER_LEVEL = 5;
const INITIAL_SNAKE = [{ x: 10, y: 10 }, { x: 9, y: 10 }, { x: 8, y: 10 }];
const DIRECTIONS: { [key: string]: { x: number; y: number } } = {
  'ArrowUp': { x: 0, y: -1 },
  'ArrowDown': { x: 0, y: 1 },
  'ArrowLeft': { x: -1, y: 0 },
  'ArrowRight': { x: 1, y: 0 },
};

// --- Helper Functions ---
const getSpeedForLevel = (level: number): number => {
    // Speed starts slower (180ms) and decreases by 5ms per level, capping at 50ms
    return Math.max(50, 180 - (level * 5));
};

// --- Custom Hook for Interval ---
const useInterval = (callback: () => void, delay: number | null) => {
  const savedCallback = useRef<(() => void) | null>(null);

  useEffect(() => {
    savedCallback.current = callback;
  }, [callback]);

  useEffect(() => {
    function tick() {
      if (savedCallback.current) {
        savedCallback.current();
      }
    }
    if (delay !== null) {
      let id = setInterval(tick, delay);
      return () => clearInterval(id);
    }
  }, [delay]);
};

// --- Main Game Component ---
const SnakeGame: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const [snake, setSnake] = useState(INITIAL_SNAKE);
  const [direction, setDirection] = useState({ x: 1, y: 0 }); // Start moving right
  
  // Bug Fix: Track the last direction actually processed by the game loop
  // This prevents the "suicide" bug where pressing two keys quickly (e.g. Up then Left) 
  // causes a 180-degree turn collision before the first move executes.
  const lastProcessedDirection = useRef({ x: 1, y: 0 });

  const [speed, setSpeed] = useState<number | null>(getSpeedForLevel(1));
  const [isGameOver, setIsGameOver] = useState(false);
  const [score, setScore] = useState(0);
  const [level, setLevel] = useState(1);
  const [obstacles, setObstacles] = useState<{ x: number, y: number }[]>([]);
  const [showInstructions, setShowInstructions] = useState(true);

  const generateObstacles = useCallback((level: number, currentSnake: { x: number, y: number }[], currentFood: { x: number, y: number }): { x: number, y: number }[] => {
    const numObstacles = level > 3 ? Math.floor((level - 1) / 3) * 2 : 0;
    if (numObstacles === 0) return [];

    const newObstacles: { x: number, y: number }[] = [];
    const occupied = new Set(currentSnake.map(s => `${s.x},${s.y}`));
    occupied.add(`${currentFood.x},${currentFood.y}`);

    for (let i = 0; i < numObstacles; i++) {
        let newObstacle;
        while (true) {
            newObstacle = {
                x: Math.floor(Math.random() * BOARD_SIZE),
                y: Math.floor(Math.random() * BOARD_SIZE),
            };
            const key = `${newObstacle.x},${newObstacle.y}`;
            if (!occupied.has(key)) {
                occupied.add(key);
                break;
            }
        }
        newObstacles.push(newObstacle);
    }
    return newObstacles;
  }, []);

  const generateFood = useCallback((currentSnake: { x: number, y: number }[], currentObstacles: { x: number, y: number }[]): { x: number, y: number } => {
    const occupied = new Set([
        ...currentSnake.map(s => `${s.x},${s.y}`),
        ...currentObstacles.map(o => `${o.x},${o.y}`),
    ]);
    while (true) {
      const newFood = {
        x: Math.floor(Math.random() * BOARD_SIZE),
        y: Math.floor(Math.random() * BOARD_SIZE),
      };
      if (!occupied.has(`${newFood.x},${newFood.y}`)) {
        return newFood;
      }
    }
  }, []);

  const [food, setFood] = useState(() => generateFood(INITIAL_SNAKE, []));

  const resetGame = useCallback(() => {
    setSnake(INITIAL_SNAKE);
    setObstacles([]);
    setFood(generateFood(INITIAL_SNAKE, []));
    
    // Reset directions
    setDirection({ x: 1, y: 0 });
    lastProcessedDirection.current = { x: 1, y: 0 };
    
    setScore(0);
    setLevel(1);
    setSpeed(getSpeedForLevel(1));
    setIsGameOver(false);
  }, [generateFood]);

  const handleDirectionChange = useCallback((newDirection: { x: number; y: number }) => {
    if (newDirection && !showInstructions && !isGameOver) {
      // Bug Fix: Check against the LAST PROCESSED direction, not the current state.
      // This prevents the user from reversing into themselves if they press two keys faster than a tick.
      const lastDir = lastProcessedDirection.current;
      
      // Prevent 180 degree turns (reversing)
      if (lastDir.x + newDirection.x !== 0 || lastDir.y + newDirection.y !== 0) {
        setDirection(newDirection);
      }
    }
  }, [showInstructions, isGameOver]);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    const newDirection = DIRECTIONS[e.key];
    if (newDirection) {
      e.preventDefault();
      handleDirectionChange(newDirection);
    }
  }, [handleDirectionChange]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown]);
  
  const gameLoop = useCallback(() => {
    // Sync the ref with the direction we are about to use for this move
    lastProcessedDirection.current = direction;

    const newSnake = [...snake];
    const head = { x: newSnake[0].x + direction.x, y: newSnake[0].y + direction.y };

    // Wall collision
    if (head.x < 0 || head.x >= BOARD_SIZE || head.y < 0 || head.y >= BOARD_SIZE) {
      setIsGameOver(true);
      setSpeed(null);
      gameAudio.playGameOverSound();
      return;
    }

    // Self collision
    for (let i = 1; i < newSnake.length; i++) {
      if (head.x === newSnake[i].x && head.y === newSnake[i].y) {
        setIsGameOver(true);
        setSpeed(null);
        gameAudio.playGameOverSound();
        return;
      }
    }

    // Obstacle collision
    if (obstacles.some(obs => obs.x === head.x && obs.y === head.y)) {
      setIsGameOver(true);
      setSpeed(null);
      gameAudio.playGameOverSound();
      return;
    }

    newSnake.unshift(head);

    // Food collision
    if (head.x === food.x && head.y === food.y) {
        const newScore = score + 1;
        setScore(newScore);
        gameAudio.playEatSound();

        // Level up logic
        const calculatedLevel = Math.floor(newScore / POINTS_PER_LEVEL) + 1;
        const newLevel = Math.min(MAX_LEVEL, calculatedLevel);

        if (newLevel > level) {
            setLevel(newLevel);
            setSpeed(getSpeedForLevel(newLevel));
            
            // Add obstacles progressively
            const newObstacles = generateObstacles(newLevel, newSnake, food);
            setObstacles(newObstacles);
            
            // Ensure food doesn't spawn on new obstacles
            setFood(generateFood(newSnake, newObstacles));
            
            gameAudio.playLevelUpSound();
        } else {
            setFood(generateFood(newSnake, obstacles));
        }
    } else {
      newSnake.pop();
    }

    setSnake(newSnake);
  }, [snake, direction, food, score, level, obstacles, generateFood, generateObstacles]);
  
  useInterval(gameLoop, isGameOver || showInstructions ? null : speed);

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4 font-sans">
      <div className="bg-gray-800/80 border-2 border-cyan-400/50 rounded-2xl shadow-2xl shadow-cyan-500/20 p-4 sm:p-6 text-white w-full max-w-md sm:max-w-lg flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center mb-4 pb-3 border-b border-cyan-400/30">
          <h2 className="text-xl sm:text-2xl font-bold tracking-wider uppercase">
            <span className="text-cyan-400">Viborita</span> Espacial
          </h2>
          <div className="flex items-center space-x-4 text-sm sm:text-base">
            <p><strong>Puntos:</strong> <span className="text-cyan-300 font-mono">{score}</span></p>
            <p><strong>Nivel:</strong> <span className="text-cyan-300 font-mono">{level}/{MAX_LEVEL}</span></p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        {/* Game Board */}
        <div className="relative aspect-square w-full bg-black/50" style={{ backgroundSize: '20px 20px', backgroundImage: 'linear-gradient(to right, rgba(0, 128, 128, 0.1) 1px, transparent 1px), linear-gradient(to bottom, rgba(0, 128, 128, 0.1) 1px, transparent 1px)' }}>
          {snake.map((segment, index) => (
            <div key={index} className="absolute bg-gradient-to-br from-gray-300 to-gray-500 border border-gray-600 rounded-sm" style={{ width: `${100 / BOARD_SIZE}%`, height: `${100 / BOARD_SIZE}%`, left: `${segment.x * (100 / BOARD_SIZE)}%`, top: `${segment.y * (100 / BOARD_SIZE)}%`, zIndex: 1 }}>
              {index === 0 && <div className="w-1/3 h-1/3 bg-red-500 rounded-full m-auto animate-pulse"></div>}
            </div>
          ))}
          <div className="absolute rounded-full bg-cyan-400 shadow-[0_0_10px_theme(colors.cyan.400)] animate-pulse" style={{ width: `${100 / BOARD_SIZE}%`, height: `${100 / BOARD_SIZE}%`, left: `${food.x * (100 / BOARD_SIZE)}%`, top: `${food.y * (100 / BOARD_SIZE)}%` }}></div>
          {obstacles.map((obs, index) => (
            <div key={`obs-${index}`} className="absolute bg-gradient-to-br from-red-700 to-red-900 border border-red-500/50 rounded-sm" style={{ width: `${100 / BOARD_SIZE}%`, height: `${100 / BOARD_SIZE}%`, left: `${obs.x * (100 / BOARD_SIZE)}%`, top: `${obs.y * (100 / BOARD_SIZE)}%` }}></div>
          ))}

          {/* Instructions Screen */}
          {showInstructions && (
             <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center z-20 text-center p-4">
                <h3 className="text-3xl font-bold text-cyan-400 mb-4">¡Bienvenido a Viborita Espacial!</h3>
                 <div className="space-y-3 text-base sm:text-lg">
                    <p><strong>Objetivo:</strong> ¡Come la energía <span className="text-cyan-400 font-bold">azul</span> para crecer y subir de nivel!</p>
                    <p><strong>Peligro:</strong> ¡No choques contra las paredes, tu cuerpo o los asteroides <span className="text-red-500 font-bold">rojos</span>!</p>
                    <p><strong>Controles:</strong> Usa las flechas del teclado o el joystick virtual.</p>
                </div>
                <button
                    onClick={() => setShowInstructions(false)}
                    className="mt-8 px-8 py-3 bg-cyan-600 hover:bg-cyan-500 rounded-lg font-semibold transition-colors text-xl focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:ring-offset-2 focus:ring-offset-gray-800"
                >
                    ¡Empezar a Jugar!
                </button>
            </div>
          )}

          {/* Game Over Screen */}
          {isGameOver && (
             <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center z-20 text-center">
                <h3 className="text-4xl font-bold text-red-500 mb-2 animate-pulse">FIN DEL JUEGO</h3>
                <p className="text-lg mb-6">Puntuación Final: <span className="font-bold text-cyan-300">{score}</span></p>
                <div className="flex space-x-4">
                    <button onClick={resetGame} className="px-6 py-2 bg-cyan-600 hover:bg-cyan-500 rounded-lg font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:ring-offset-2 focus:ring-offset-gray-800">Jugar de Nuevo</button>
                    <button onClick={onClose} className="px-6 py-2 bg-gray-600 hover:bg-gray-500 rounded-lg font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2 focus:ring-offset-gray-800">Cerrar</button>
                </div>
            </div>
          )}
        </div>
        
        {/* Joystick and Info Text Container */}
        <div className="flex-grow flex flex-col justify-center items-center pt-2 min-h-[148px] sm:min-h-[164px]">
            {!isGameOver && !showInstructions && (
                <>
                    <div className="grid grid-cols-3 grid-rows-3 w-32 h-32 sm:w-36 sm:h-36">
                        <button onTouchStart={(e) => {e.preventDefault(); handleDirectionChange(DIRECTIONS['ArrowUp'])}} onClick={() => handleDirectionChange(DIRECTIONS['ArrowUp'])} className="col-start-2 row-start-1 p-2 bg-gray-500/50 rounded-full active:bg-cyan-400/50 flex items-center justify-center">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 15l7-7 7 7" /></svg>
                        </button>
                        <button onTouchStart={(e) => {e.preventDefault(); handleDirectionChange(DIRECTIONS['ArrowLeft'])}} onClick={() => handleDirectionChange(DIRECTIONS['ArrowLeft'])} className="col-start-1 row-start-2 p-2 bg-gray-500/50 rounded-full active:bg-cyan-400/50 flex items-center justify-center">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" /></svg>
                        </button>
                        <button onTouchStart={(e) => {e.preventDefault(); handleDirectionChange(DIRECTIONS['ArrowRight'])}} onClick={() => handleDirectionChange(DIRECTIONS['ArrowRight'])} className="col-start-3 row-start-2 p-2 bg-gray-500/50 rounded-full active:bg-cyan-400/50 flex items-center justify-center">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" /></svg>
                        </button>
                        <button onTouchStart={(e) => {e.preventDefault(); handleDirectionChange(DIRECTIONS['ArrowDown'])}} onClick={() => handleDirectionChange(DIRECTIONS['ArrowDown'])} className="col-start-2 row-start-3 p-2 bg-gray-500/50 rounded-full active:bg-cyan-400/50 flex items-center justify-center">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
                        </button>
                    </div>
                    <p className="text-center text-xs text-gray-400 mt-2 h-4">Usa las teclas de flecha o el joystick para moverte.</p>
                </>
            )}
        </div>
      </div>
    </div>
  );
};

export default SnakeGame;