import React, { useEffect, useState } from 'react';
import { useSocket } from '../contexts/SocketContext';
import { motion, AnimatePresence } from 'framer-motion';
import { TrendingUp, TrendingDown, Zap } from 'lucide-react';

interface Signal {
  trend: string;
  confidence: number;
  entryM1: string;
  entryM5: string;
  userName: string;
  timestamp: string;
}

export const GlobalSignalFeed: React.FC = () => {
  const { lastSignal } = useSocket();
  const [signals, setSignals] = useState<Signal[]>([]);

  useEffect(() => {
    if (lastSignal) {
      setSignals(prev => [lastSignal, ...prev].slice(0, 5));
    }
  }, [lastSignal]);

  if (signals.length === 0) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 mb-4">
        <Zap className="w-4 h-4 text-[#00ff41] fill-[#00ff41]" />
        <h2 className="text-sm font-mono text-[#888] uppercase tracking-widest">FEED GLOBAL EM TEMPO REAL</h2>
      </div>

      <div className="space-y-2">
        <AnimatePresence initial={false}>
          {signals.map((signal, idx) => (
            <motion.div
              key={signal.timestamp + idx}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="p-3 bg-[#141414] border border-white/5 rounded-xl flex items-center justify-between group hover:border-[#00ff41]/30 transition-all"
            >
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${signal.trend === 'Alta' ? 'bg-[#00ff41]/10 text-[#00ff41]' : 'bg-red-500/10 text-red-500'}`}>
                  {signal.trend === 'Alta' ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black text-white uppercase tracking-tighter">{signal.userName}</span>
                    <span className="text-[9px] font-mono text-[#444]">{new Date(signal.timestamp).toLocaleTimeString()}</span>
                  </div>
                  <p className={`text-xs font-black italic ${signal.trend === 'Alta' ? 'text-[#00ff41]' : 'text-red-500'}`}>
                    {signal.trend.toUpperCase()} @ {signal.entryM1}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-[9px] font-mono text-[#444] uppercase tracking-widest">CONFIANÇA</p>
                <p className="text-xs font-mono font-bold text-white">{signal.confidence}%</p>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
};
