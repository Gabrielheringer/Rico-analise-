import React, { useEffect, useState } from 'react';
import { History, Clock, TrendingUp, TrendingDown, Minus, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface HistoryItem {
  trend: string;
  confidence: number;
  entry_m1: string;
  entry_m5: string;
  rationale?: string;
  created_at: string;
}

interface AnalysisHistoryProps {
  analysisCount?: number;
}

export const AnalysisHistory: React.FC<AnalysisHistoryProps> = ({ analysisCount }) => {
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

  const fetchHistory = async () => {
    try {
      const response = await fetch('/api/analysis/history', { credentials: 'include' });
      if (response.ok) {
        const data = await response.json();
        setHistory(data.history);
      }
    } catch (err) {
      console.error('Erro ao buscar histórico:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, [analysisCount]);

  useEffect(() => {
    // Refresh history every minute as backup
    const interval = setInterval(fetchHistory, 60000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="p-6 bg-[#141414] rounded-2xl terminal-border animate-pulse">
        <div className="h-4 w-32 bg-white/5 rounded mb-4" />
        <div className="space-y-3">
          <div className="h-12 bg-white/5 rounded-xl" />
          <div className="h-12 bg-white/5 rounded-xl" />
        </div>
      </div>
    );
  }

  if (history.length === 0) {
    return null;
  }

  return (
    <div className="p-6 bg-[#141414] rounded-2xl terminal-border">
      <div className="flex items-center gap-2 mb-6">
        <History className="w-4 h-4 text-[#00ff41]" />
        <h3 className="text-xs font-mono text-[#888] uppercase tracking-widest">ÚLTIMAS ANÁLISES</h3>
      </div>

      <div className="space-y-3">
        {history.map((item, index) => {
          const isUp = item.trend === "Alta";
          const isDown = item.trend === "Baixa";
          const date = new Date(item.created_at);
          const timeStr = date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
          const dateStr = date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
          const isExpanded = expandedIndex === index;

          return (
            <motion.div
              key={index}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
              className={cn(
                "group flex flex-col p-3 bg-black/20 rounded-xl border transition-all cursor-pointer",
                isExpanded ? "border-[#00ff41]/50 bg-black/40" : "border-white/5 hover:border-[#00ff41]/30"
              )}
              onClick={() => setExpandedIndex(isExpanded ? null : index)}
            >
              <div className="flex items-center justify-between w-full">
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "p-2 rounded-lg",
                    isUp ? "bg-[#00ff41]/10 text-[#00ff41]" : isDown ? "bg-red-500/10 text-red-500" : "bg-blue-500/10 text-blue-500"
                  )}>
                    {isUp && <TrendingUp className="w-4 h-4" />}
                    {isDown && <TrendingDown className="w-4 h-4" />}
                    {!isUp && !isDown && <Minus className="w-4 h-4" />}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className={cn(
                        "text-[10px] font-black italic",
                        isUp ? "text-[#00ff41]" : isDown ? "text-red-500" : "text-blue-500"
                      )}>
                        {item.trend.toUpperCase()}
                      </span>
                      <span className="text-[10px] font-mono text-[#444]">{item.confidence}%</span>
                    </div>
                    <div className="flex gap-2 mt-0.5">
                      <span className="text-[9px] font-mono text-[#666]">M1: <span className="text-white/60">{item.entry_m1}</span></span>
                      <span className="text-[9px] font-mono text-[#666]">M5: <span className="text-white/60">{item.entry_m5}</span></span>
                    </div>
                  </div>
                </div>
                
                <div className="text-right flex items-center gap-3">
                  <div className="flex flex-col items-end">
                    <div className="flex items-center gap-1 text-[9px] font-mono text-[#444]">
                      <Clock className="w-3 h-3" />
                      {timeStr}
                    </div>
                    <span className="text-[8px] font-mono text-[#222]">{dateStr}</span>
                  </div>
                  <ChevronDown className={cn(
                    "w-4 h-4 text-[#444] transition-transform duration-300",
                    isExpanded && "rotate-180 text-[#00ff41]"
                  )} />
                </div>
              </div>

              <AnimatePresence>
                {isExpanded && item.rationale && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="pt-3 mt-3 border-t border-white/5">
                      <p className="text-[10px] font-mono text-[#444] uppercase tracking-widest mb-1">Justificativa Técnica:</p>
                      <p className="text-[11px] text-white/70 leading-relaxed italic">
                        {item.rationale}
                      </p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};
