
import React, { useState, useEffect, useRef } from 'react';
import { MathContent } from '../types';

interface MathVivaMessageProps {
  content: MathContent;
  onAction?: (action: string) => void;
}

interface VisualUnit {
  id: string;
  value: number;
  label: string;
  color: string;
  size: number;
}

const AggregateVisualizer: React.FC<{ 
  total: number, 
  colorBase: 'blue' | 'amber' | 'rose' | 'emerald'
}> = ({ total, colorBase }) => {
  const units: VisualUnit[] = [];
  let remaining = total;

  const config = {
    blue: { bg: 'bg-blue-600', text: 'text-blue-100', border: 'border-blue-400' },
    amber: { bg: 'bg-amber-500', text: 'text-amber-900', border: 'border-amber-300' },
    rose: { bg: 'bg-rose-500', text: 'text-rose-100', border: 'border-rose-400' },
    emerald: { bg: 'bg-emerald-500', text: 'text-emerald-50', border: 'border-emerald-400' }
  }[colorBase];

  // Break down into aggregate blocks with huge numbers support
  const denominations = [
    { val: 1000000000, label: '1B', size: 140 },
    { val: 100000000, label: '100M', size: 120 },
    { val: 10000000, label: '10M', size: 110 },
    { val: 1000000, label: '1M', size: 100 },
    { val: 100000, label: '100k', size: 90 },
    { val: 10000, label: '10k', size: 80 },
    { val: 1000, label: '1k', size: 64 },
    { val: 100, label: '100', size: 48 },
    { val: 10, label: '10', size: 36 },
    { val: 1, label: '1', size: 24 }
  ];

  denominations.forEach(d => {
    const count = Math.floor(remaining / d.val);
    for (let i = 0; i < count; i++) {
      units.push({
        id: `${d.val}-${i}-${Math.random()}`,
        value: d.val,
        label: d.label,
        color: config.bg,
        size: d.size
      });
    }
    remaining %= d.val;
  });

  return (
    <div className="flex flex-wrap gap-2 content-start p-4 min-h-[100px] justify-center md:justify-start">
      {units.map(unit => (
        <div 
          key={unit.id}
          className={`${unit.color} ${config.border} border-2 rounded-lg flex items-center justify-center shadow-md transform hover:scale-110 transition-transform cursor-default`}
          style={{ width: unit.size, height: unit.size }}
        >
          <span className={`font-black text-[10px] ${config.text} select-none`}>
            {unit.label}
          </span>
        </div>
      ))}
      {total === 0 && <span className="text-gray-200 font-black italic uppercase tracking-widest self-center w-full text-center py-4">Cero / Vacío</span>}
    </div>
  );
};

const MathVivaMessage: React.FC<MathVivaMessageProps> = ({ content, onAction }) => {
  const [valA, setValA] = useState(1);
  const [valB, setValB] = useState(1);
  const [opType, setOpType] = useState<'multi' | 'div' | 'sqrt' | 'add' | 'sub'>('multi');
  const [customOp, setCustomOp] = useState('');
  const [showTableList, setShowTableList] = useState(false);

  useEffect(() => {
    const isDiv = content.operation.includes('/') || content.operation.includes('÷') || content.operation.toLowerCase().includes('div');
    const isSqrt = content.operation.includes('√') || content.operation.toLowerCase().includes('raíz');
    const isAdd = content.operation.includes('+');
    const isSub = content.operation.includes('-');
    
    const nums = content.operation.match(/\d+(\.\d+)?/g)?.map(Number) || [1, 1];

    if (isSqrt) {
      setOpType('sqrt');
      setValA(Math.floor(Math.sqrt(nums[0] || 1)));
    } else if (isDiv) {
      setOpType('div');
      setValA(nums[0] || 0);
      setValB(nums[1] || 1);
    } else if (isAdd) {
      setOpType('add');
      setValA(nums[0] || 0);
      setValB(nums[1] || 0);
    } else if (isSub) {
      setOpType('sub');
      setValA(nums[0] || 0);
      setValB(nums[1] || 0);
    } else {
      setOpType('multi');
      setValA(nums[0] || 1);
      setValB(nums[1] || 1);
    }
  }, [content.operation]);

  const getResult = () => {
    switch(opType) {
      case 'div': return Math.floor(valA / valB);
      case 'sqrt': return valA;
      case 'add': return valA + valB;
      case 'sub': return valA - valB;
      default: return valA * valB;
    }
  };

  const renderOpSign = () => {
    switch(opType) {
      case 'div': return '÷';
      case 'sqrt': return '√';
      case 'add': return '+';
      case 'sub': return '-';
      default: return '×';
    }
  };

  const menuItems = [
    { id: 'add', label: 'Sumas', icon: '+', p: 'Enséñame a sumar con bloques' },
    { id: 'sub', label: 'Restas', icon: '-', p: 'Enséñame a restar con bloques' },
    { id: 'multi', label: 'Multiplicar', icon: '×', p: 'Enséñame a multiplicar con bloques' },
    { id: 'div', label: 'Dividir', icon: '÷', p: 'Enséñame a dividir con bloques' },
    { id: 'sqrt', label: 'Raíz', icon: '√', p: 'Enséñame la raíz cuadrada con bloques' },
    { id: 'tablas', label: 'Tablas', icon: '▤', action: () => setShowTableList(!showTableList) },
  ];

  return (
    <div className="w-full bg-white rounded-[4rem] overflow-hidden border border-gray-100 shadow-2xl animate-fade-in font-sans">
      <div className="bg-[#1e3a8a] p-5 flex flex-col gap-4 shadow-inner">
        <div className="flex gap-3 overflow-x-auto scrollbar-hide">
          {menuItems.map(item => (
            <button 
              key={item.id}
              onClick={() => item.action ? item.action() : onAction?.(item.p)}
              className={`px-5 py-3 rounded-2xl flex items-center gap-2 transition-all active:scale-95 text-white whitespace-nowrap ${item.id === 'tablas' && showTableList ? 'bg-white/30 ring-2 ring-white/50' : 'bg-white/10 hover:bg-white/20 border border-white/10'}`}
            >
              <span className="font-black text-blue-300 text-xl">{item.icon}</span>
              <span className="text-[11px] font-black uppercase tracking-widest">{item.label}</span>
            </button>
          ))}
        </div>

        {showTableList && (
          <div className="flex flex-wrap gap-2.5 pt-3 animate-fade-in border-t border-white/10 mt-2">
            {Array.from({ length: 13 }, (_, i) => i + 1).map(n => (
              <button 
                key={n} 
                onClick={() => { onAction?.(`Enséñame la tabla del ${n} con bloques visuales`); setShowTableList(false); }}
                className="w-11 h-11 rounded-xl bg-white/10 hover:bg-white/30 text-white font-black text-sm transition-colors border border-white/10"
              >
                {n}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="p-10 pb-0">
        <div className="flex items-center gap-3 mb-6">
            <div className="w-3.5 h-3.5 rounded-full bg-blue-600 animate-pulse"></div>
            <span className="text-[12px] font-black text-[#1e3a8a] uppercase tracking-[0.6em] opacity-40">Laboratorio de Macro-Matemáticas</span>
        </div>
        
        <div className="flex flex-wrap items-center gap-8 mb-8">
          <div className="flex items-center gap-4">
             {opType === 'sqrt' && <span className="text-5xl font-black text-gray-200">√</span>}
             <h2 className="text-7xl font-mono font-black tracking-tighter text-[#1e3a8a]">
               {opType === 'sqrt' ? valA * valA : valA}
             </h2>
             {opType !== 'sqrt' && <span className="text-4xl font-black text-gray-200">{renderOpSign()}</span>}
             {opType !== 'sqrt' && <h2 className="text-7xl font-mono font-black tracking-tighter text-[#1e3a8a]">{valB}</h2>}
          </div>
          
          <div className="h-16 w-px bg-gray-100 hidden md:block"></div>
          
          <div className="flex flex-col">
            <span className="text-[10px] font-black text-gray-300 uppercase tracking-widest">Resultado Final</span>
            <div className="flex items-baseline gap-3">
                <span className="text-6xl font-mono font-black text-blue-900">{getResult()}</span>
                {opType === 'div' && valA % valB > 0 && (
                    <div className="flex flex-col">
                        <span className="text-[8px] font-black text-rose-400 uppercase tracking-widest">Sobrante</span>
                        <span className="text-2xl font-mono font-black text-rose-500 tracking-tighter">R: {valA % valB}</span>
                    </div>
                )}
            </div>
          </div>
        </div>
      </div>

      <div className="px-10 py-6 space-y-8">
        {/* Controls */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-gray-50 p-6 rounded-[3rem] border border-gray-100 shadow-inner">
           <div className="space-y-2">
              <label className="text-[9px] font-black text-blue-600 uppercase tracking-widest px-4">
                {opType === 'div' ? 'Dividendo' : opType === 'sqrt' ? 'Base del Cuadrado' : 'Valor A'}
              </label>
              <div className="flex items-center gap-3 bg-white p-2 rounded-2xl shadow-sm border border-blue-50">
                <button onClick={() => setValA(v => Math.max(0, v - 1))} className="w-10 h-10 rounded-xl bg-blue-50 hover:bg-blue-100 font-black">-</button>
                <input type="number" value={valA} onChange={e => setValA(Number(e.target.value))} className="flex-1 text-center font-mono font-black text-blue-900 bg-transparent outline-none" />
                <button onClick={() => setValA(v => v + 1)} className="w-10 h-10 rounded-xl bg-blue-50 hover:bg-blue-100 font-black">+</button>
              </div>
           </div>
           {opType !== 'sqrt' && (
             <div className="space-y-2">
                <label className="text-[9px] font-black text-amber-600 uppercase tracking-widest px-4">
                  {opType === 'div' ? 'Divisor' : 'Valor B'}
                </label>
                <div className="flex items-center gap-3 bg-white p-2 rounded-2xl shadow-sm border border-amber-50">
                  <button onClick={() => setValB(v => Math.max(1, v - 1))} className="w-10 h-10 rounded-xl bg-amber-50 hover:bg-amber-100 font-black">-</button>
                  <input type="number" value={valB} onChange={e => setValB(Number(e.target.value))} className="flex-1 text-center font-mono font-black text-amber-900 bg-transparent outline-none" />
                  <button onClick={() => setValB(v => v + 1)} className="w-10 h-10 rounded-xl bg-amber-50 hover:bg-amber-100 font-black">+</button>
                </div>
             </div>
           )}
        </div>

        {/* Visualizer Area */}
        <div className={`grid grid-cols-1 ${opType === 'div' ? 'xl:grid-cols-4 lg:grid-cols-2' : 'lg:grid-cols-3 md:grid-cols-2'} gap-6 min-h-[400px]`}>
           {/* Operand A Section */}
           <div className="bg-blue-50/30 rounded-[3.5rem] border-4 border-dashed border-blue-100 overflow-hidden flex flex-col">
              <div className="bg-blue-600 py-2 px-6 text-white text-[9px] font-black uppercase tracking-[0.4em]">
                {opType === 'sqrt' ? 'Cuadrado Completo' : opType === 'add' ? 'Sumando 1' : opType === 'sub' ? 'Minuendo' : opType === 'div' ? 'Dividendo' : 'Primer Elemento'}
              </div>
              <AggregateVisualizer total={opType === 'sqrt' ? valA * valA : valA} colorBase="blue" />
           </div>

           {/* Operand B Section */}
           <div className="bg-amber-50/30 rounded-[3.5rem] border-4 border-dashed border-amber-100 overflow-hidden flex flex-col">
              <div className="bg-amber-500 py-2 px-6 text-white text-[9px] font-black uppercase tracking-[0.4em]">
                {opType === 'sqrt' ? 'Lado del Cuadrado' : opType === 'add' ? 'Sumando 2' : opType === 'sub' ? 'Sustraendo' : opType === 'div' ? 'Divisor' : 'Segundo Elemento'}
              </div>
              <AggregateVisualizer total={opType === 'sqrt' ? valA : valB} colorBase="amber" />
           </div>

           {/* Result Section (NEW) */}
           <div className="bg-emerald-50/30 rounded-[3.5rem] border-4 border-dashed border-emerald-100 overflow-hidden flex flex-col">
              <div className="bg-emerald-500 py-2 px-6 text-white text-[9px] font-black uppercase tracking-[0.4em]">
                {opType === 'multi' ? 'Producto (Suma)' : opType === 'div' ? 'Cociente (Grupos)' : opType === 'add' ? 'Suma Total' : opType === 'sub' ? 'Diferencia' : 'Raíz (Lado)'}
              </div>
              <AggregateVisualizer total={getResult()} colorBase="emerald" />
           </div>

           {/* Remainder Section */}
           {opType === 'div' && (
              <div className="bg-rose-50/30 rounded-[3.5rem] border-4 border-dashed border-rose-100 overflow-hidden flex flex-col md:col-span-2 lg:col-span-2 xl:col-span-1">
                 <div className="bg-rose-500 py-2 px-6 text-white text-[9px] font-black uppercase tracking-[0.4em]">Sobrante (Residuo)</div>
                 <AggregateVisualizer total={valA % valB} colorBase="rose" />
              </div>
           )}
        </div>

        {/* Input for Manual Calculations */}
        <div className="p-8 bg-gray-900 rounded-[3.5rem] text-white shadow-2xl flex gap-4 items-center">
            <div className="flex-1">
              <p className="text-[10px] font-black text-blue-400 uppercase tracking-[0.5em] mb-2 px-2">Calculadora de Bloques Gigantes</p>
              <input 
                  type="text" 
                  value={customOp}
                  onChange={(e) => setCustomOp(e.target.value)}
                  placeholder="Ej: 1250 / 3 o 5000 + 75..." 
                  className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-base font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                  onKeyDown={(e) => { if (e.key === 'Enter' && customOp.trim()) { onAction?.(customOp); setCustomOp(''); } }}
              />
            </div>
            <button onClick={() => { if(customOp.trim()) { onAction?.(customOp); setCustomOp(''); } }} className="bg-blue-600 hover:bg-blue-500 p-6 rounded-2xl transition-all shadow-lg active:scale-95 h-fit mt-5">
                <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
            </button>
        </div>

        <div className="pt-8 border-t border-gray-50 flex justify-center">
            <div className="inline-block p-8 bg-blue-50/30 rounded-[3rem] border border-blue-100 shadow-sm max-w-2xl text-center">
                <p className="text-[10px] font-black text-blue-400 uppercase tracking-[0.6em] mb-3">Pista Socrática del Laboratorio</p>
                <p className="text-[#1e3a8a] font-bold text-lg px-6 leading-tight italic">" {content.socraticHint} "</p>
            </div>
        </div>
      </div>
    </div>
  );
};

export default MathVivaMessage;
