import React from 'react';
import { TrendingUp, TrendingDown, Minus, AlertCircle, CheckCircle2, Info, BellRing, Key } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { AnalysisResult } from '../services/gemini';
import { UserSettings } from './SettingsModal';
import { RobotAssistant } from './RobotAssistant';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface AnalysisPanelProps {
  result: AnalysisResult | null;
  error: string | null;
  settings: UserSettings;
  onOpenPricing?: () => void;
  onRetry?: () => void;
  onSelectKey?: () => void;
}

export const AnalysisPanel: React.FC<AnalysisPanelProps> = ({ result, error, settings, onOpenPricing, onRetry, onSelectKey }) => {
  const [timeframe, setTimeframe] = React.useState<'M1' | 'M5'>('M1');

  if (error) {
    const isQuotaError = error.includes("Quota Excedida") || error.includes("429") || error.includes("limite");
    
    return (
      <div className="p-6 bg-red-500/10 border border-red-500/30 rounded-2xl flex flex-col gap-4">
        <div className="flex items-start gap-4">
          <AlertCircle className="text-red-500 w-6 h-6 shrink-0" />
          <div className="flex-1">
            <h3 className="text-red-500 font-bold">ERRO NO PROCESSAMENTO</h3>
            <p className="text-sm text-red-400/80 mt-1">{error}</p>
          </div>
        </div>
        
        <div className="p-3 bg-black/40 rounded-lg border border-red-500/20">
          <p className="text-[10px] font-mono text-red-400/50 uppercase tracking-widest mb-2">Sugestões de Resolução:</p>
          <ul className="text-[10px] text-red-400/60 space-y-1 list-disc ml-4">
            {isQuotaError ? (
              <>
                <li>Aguarde o tempo sugerido na mensagem de erro.</li>
                <li>Use sua própria chave de API para limites maiores.</li>
                <li>Considere um plano pago para acesso prioritário.</li>
              </>
            ) : (
              <>
                <li>Verifique se a imagem está nítida e mostra o gráfico claramente.</li>
                <li>Tente capturar uma área menor do gráfico.</li>
                <li>Certifique-se de que sua conexão com a internet está estável.</li>
              </>
            )}
          </ul>
        </div>

        <div className="flex flex-col gap-2">
          <div className="flex gap-2">
            <button
              onClick={onRetry}
              className="flex-1 py-2 bg-red-500/20 border border-red-500/40 text-red-500 text-[10px] font-bold uppercase tracking-widest rounded-lg hover:bg-red-500/30 transition-all"
            >
              TENTAR NOVAMENTE
            </button>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-white/5 border border-white/10 text-white/40 text-[10px] font-bold uppercase tracking-widest rounded-lg hover:bg-white/10 transition-all"
            >
              RECARREGAR
            </button>
          </div>
          
          {isQuotaError && onSelectKey && (
            <button
              onClick={onSelectKey}
              className="w-full py-2.5 bg-[#00ff41]/10 border border-[#00ff41]/30 text-[#00ff41] text-[10px] font-black uppercase tracking-widest rounded-lg hover:bg-[#00ff41] hover:text-black transition-all flex items-center justify-center gap-2"
            >
              <Key className="w-4 h-4" />
              USAR MINHA PRÓPRIA CHAVE (BYPASS LIMIT)
            </button>
          )}
        </div>
      </div>
    );
  }

  if (!result) {
    return (
      <div className="p-12 border border-dashed border-[#222] rounded-2xl flex flex-col items-center justify-center text-center">
        <div className="w-16 h-16 bg-[#141414] rounded-full flex items-center justify-center mb-4">
          <Info className="text-[#444] w-8 h-8" />
        </div>
        <h3 className="text-[#888] font-medium">Aguardando Captura</h3>
        <p className="text-[#444] text-sm mt-2 max-w-xs mb-6">Aponte a câmera para o gráfico e clique em 'Analisar Agora' para receber sinais de entrada.</p>
        <button
          onClick={onOpenPricing}
          className="px-6 py-2 rounded-lg bg-[#00ff41]/10 border border-[#00ff41]/30 text-[#00ff41] text-[10px] font-black uppercase tracking-widest hover:bg-[#00ff41] hover:text-black transition-all"
        >
          Ver Planos de Assinatura
        </button>
      </div>
    );
  }

  const isUp = result.trend === "Alta";
  const isDown = result.trend === "Baixa";
  
  const meetsConfidence = result.confidence >= settings.minConfidence;
  const meetsStrength = result.strength >= settings.minStrength;
  const isHighQualitySignal = meetsConfidence && meetsStrength;

  const robotMessage = isUp 
    ? `Análise concluída. Oportunidade de COMPRA detectada com ${result.confidence}% de confiança.` 
    : isDown 
    ? `Análise concluída. Oportunidade de VENDA detectada com ${result.confidence}% de confiança.`
    : `Análise concluída. O mercado está lateralizado no momento.`;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      {/* Robot Assistant */}
      <RobotAssistant key={result.rationale} text={robotMessage} />

      {/* Alert if signal is high quality */}
      <AnimatePresence>
        {isHighQualitySignal && settings.enableAlerts && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="p-4 bg-[#00ff41]/10 border border-[#00ff41]/30 rounded-xl flex items-center gap-3 shadow-[0_0_15px_rgba(0,255,65,0.1)]"
          >
            <div className="relative">
              <BellRing className="w-5 h-5 text-[#00ff41] animate-bounce" />
              <div className="absolute inset-0 blur-md bg-[#00ff41]/40 animate-pulse" />
            </div>
            <p className="text-xs font-bold text-[#00ff41] uppercase tracking-wider">Sinal de Alta Qualidade Detectado!</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Signal Card */}
      <div className={cn(
        "p-6 bg-[#141414] rounded-2xl terminal-border relative overflow-hidden transition-all duration-500",
        isHighQualitySignal && settings.enableAlerts && "border-[#00ff41]/50 shadow-[0_0_30px_rgba(0,255,65,0.1)]"
      )}>
        <div className={cn(
          "absolute top-0 right-0 w-32 h-32 blur-[80px] opacity-20",
          isUp ? "bg-[#00ff41]" : isDown ? "bg-red-500" : "bg-blue-500"
        )} />
        
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className={cn(
              "p-3 rounded-xl",
              isUp ? "bg-[#00ff41]/10 text-[#00ff41]" : isDown ? "bg-red-500/10 text-red-500" : "bg-blue-500/10 text-blue-500"
            )}>
              {isUp && <TrendingUp className="w-6 h-6" />}
              {isDown && <TrendingDown className="w-6 h-6" />}
              {!isUp && !isDown && <Minus className="w-6 h-6" />}
            </div>
            <div>
              <p className="text-[10px] font-mono text-[#888] uppercase tracking-widest mb-1">MODO / TENDÊNCIA</p>
              <div className="flex items-center gap-3">
                <div className="flex bg-black/40 p-1 rounded-lg border border-white/5">
                  <button
                    onClick={() => setTimeframe('M1')}
                    className={cn(
                      "px-3 py-1 text-[10px] font-black rounded-md transition-all",
                      timeframe === 'M1' ? "bg-[#00ff41] text-black" : "text-[#444] hover:text-[#888]"
                    )}
                  >
                    M1
                  </button>
                  <button
                    onClick={() => setTimeframe('M5')}
                    className={cn(
                      "px-3 py-1 text-[10px] font-black rounded-md transition-all",
                      timeframe === 'M5' ? "bg-[#00ff41] text-black" : "text-[#444] hover:text-[#888]"
                    )}
                  >
                    M5
                  </button>
                </div>
                <h2 className={cn(
                  "text-xl font-black italic",
                  isUp ? "text-[#00ff41]" : isDown ? "text-red-500" : "text-blue-500"
                )}>
                  {result.trend.toUpperCase()}
                </h2>
              </div>
            </div>
          </div>
          <div className="text-right">
            <p className="text-[10px] font-mono text-[#888] uppercase tracking-widest">CONFIANÇA</p>
            <p className={cn(
              "text-2xl font-mono font-bold",
              meetsConfidence ? "text-white" : "text-white/40"
            )}>{result.confidence}%</p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4">
          <div className="p-6 bg-black/40 rounded-2xl border border-white/5 relative group overflow-hidden">
            <div className="absolute top-0 left-0 w-1 h-full bg-[#00ff41]" />
            <p className="text-[10px] font-mono text-[#444] uppercase tracking-widest mb-2">SINAL DE ENTRADA {timeframe}</p>
            <div className="flex items-baseline gap-2">
              <p className={cn(
                "text-3xl font-black italic tracking-tighter",
                isUp ? "text-[#00ff41]" : isDown ? "text-red-500" : "text-blue-500"
              )}>
                {timeframe === 'M1' ? result.entryM1 : result.entryM5}
              </p>
              <span className="text-[10px] font-mono text-[#444] uppercase tracking-widest">EXECUTAR AGORA</span>
            </div>
          </div>
        </div>
      </div>

      {/* Rationale */}
      <div className="p-6 bg-[#141414] rounded-2xl terminal-border">
        <div className="flex items-center gap-2 mb-4">
          <CheckCircle2 className="w-4 h-4 text-[#00ff41]" />
          <h3 className="text-xs font-mono text-[#888] uppercase tracking-widest">JUSTIFICATIVA TÉCNICA</h3>
        </div>
        <p className="text-sm text-white/80 leading-relaxed font-light">
          {result.rationale}
        </p>
      </div>

      {/* Strength Meter */}
      <div className="p-6 bg-[#141414] rounded-2xl terminal-border">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-xs font-mono text-[#888] uppercase tracking-widest">FORÇA DO SINAL</h3>
          <span className={cn(
            "text-xs font-mono",
            meetsStrength ? "text-white" : "text-white/40"
          )}>{result.strength}%</span>
        </div>
        <div className="w-full h-2 bg-black rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${result.strength}%` }}
            className={cn(
              "h-full rounded-full",
              isUp ? "bg-[#00ff41]" : isDown ? "bg-red-500" : "bg-blue-500"
            )}
          />
        </div>
      </div>

      {/* Action Button */}
      <button
        onClick={onRetry}
        className="w-full py-4 bg-[#00ff41]/10 border border-[#00ff41]/30 text-[#00ff41] text-xs font-black uppercase tracking-[0.2em] rounded-2xl hover:bg-[#00ff41] hover:text-black transition-all shadow-[0_0_20px_rgba(0,255,65,0.05)] flex items-center justify-center gap-2 group"
      >
        <TrendingUp className="w-4 h-4 group-hover:scale-110 transition-transform" />
        Analisar Novamente
      </button>
    </motion.div>
  );
};
