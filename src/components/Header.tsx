import React from 'react';
import { Shield, Activity, Cpu, LogOut, Sparkles, Smartphone } from 'lucide-react';
import { LivePresence } from './LivePresence';

interface HeaderProps {
  user?: any;
  onLogout?: () => void;
  onOpenPricing?: () => void;
  onOpenInstall?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ user, onLogout, onOpenPricing, onOpenInstall }) => {
  return (
    <header className="w-full py-4 px-6 border-b border-[#222] flex items-center justify-between bg-[#0a0a0a]/80 backdrop-blur-md sticky top-0 z-50">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-[#00ff41]/10 rounded-lg flex items-center justify-center border border-[#00ff41]/30">
          <Shield className="text-[#00ff41] w-6 h-6" />
        </div>
        <div>
          <h1 className="text-xl font-bold tracking-tighter text-white">R.I.C.O. <span className="text-[#00ff41]">ANÁLISE</span></h1>
          <p className="text-[10px] font-mono text-[#888] uppercase tracking-widest">SISTEMA DE INTELIGÊNCIA QUANTITATIVA</p>
        </div>
      </div>
      
      <div className="flex items-center gap-6">
        <div className="hidden md:flex items-center gap-6">
          <LivePresence />
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-[#00ff41]" />
            <span className="text-xs font-mono text-[#888]">STATUS: ONLINE</span>
          </div>
          <div className="flex items-center gap-2">
            <Cpu className="w-4 h-4 text-[#00ff41]" />
            <span className="text-xs font-mono text-[#888]">IA: GEMINI 2.5</span>
          </div>
        </div>

        {user && (
          <div className="flex items-center gap-4 pl-6 border-l border-[#222]">
            <button
              onClick={onOpenInstall}
              className="p-2 rounded-lg bg-white/5 border border-white/10 text-[#888] hover:text-[#00ff41] hover:border-[#00ff41]/30 transition-all hidden sm:flex"
              title="Instalar no Celular"
            >
              <Smartphone className="w-4 h-4" />
            </button>
            {user.plan === 'free' && user.email !== 'admin@rico.com' && (
              <button
                onClick={onOpenPricing}
                className="flex items-center gap-2 px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg bg-[#00ff41]/10 border border-[#00ff41]/30 text-[#00ff41] hover:bg-[#00ff41] hover:text-black transition-all group"
              >
                <Sparkles className="w-3 h-3 sm:w-4 sm:h-4 group-hover:animate-pulse" />
                <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-widest">Planos</span>
              </button>
            )}
            <div className="text-right hidden sm:block">
              <p className="text-[10px] font-mono text-[#444] uppercase tracking-widest">OPERADOR</p>
              <p className="text-xs font-bold text-white uppercase">{user.name}</p>
            </div>
            <button 
              onClick={onLogout}
              className="p-2 rounded-lg bg-red-500/10 border border-red-500/20 text-red-500 hover:bg-red-500 hover:text-white transition-all"
              title="Sair do Sistema"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </header>
  );
};
