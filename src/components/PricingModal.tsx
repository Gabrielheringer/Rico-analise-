import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Check, Zap, Crown, Shield, Loader2 } from 'lucide-react';

interface PricingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectPlan: (plan: 'weekly' | 'monthly') => void;
}

declare global {
  interface Window {
    MercadoPago: any;
  }
}

export const PricingModal: React.FC<PricingModalProps> = ({ isOpen, onClose, onSelectPlan }) => {
  const [loading, setLoading] = useState<string | null>(null);

  const handleCheckout = async (plan: 'weekly' | 'monthly') => {
    setLoading(plan);
    try {
      const token = localStorage.getItem('rico_token');
      const response = await fetch('/api/checkout/create-preference', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        credentials: 'include',
        body: JSON.stringify({ planType: plan }),
      });
      
      const contentType = response.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        throw new Error("O servidor retornou uma resposta inválida (não-JSON).");
      }
      
      const data = await response.json();
      
      if (data.id && window.MercadoPago) {
        const mp = new window.MercadoPago('APP_USR-207e6335-64db-4ce9-8e8b-9c133204c8a9');
        mp.checkout({
          preference: {
            id: data.id
          },
          autoOpen: true,
        });
      } else if (data.init_point) {
        window.location.href = data.init_point;
      } else {
        onSelectPlan(plan);
      }
    } catch (error) {
      console.error('Checkout error:', error);
      onSelectPlan(plan);
    } finally {
      setLoading(null);
    }
  };
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 overflow-y-auto">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/95 backdrop-blur-xl"
          />
          
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-4xl bg-[#141414] rounded-3xl terminal-border p-6 sm:p-8 my-auto"
          >
            {/* Background Glow */}
            <div className="absolute top-0 left-1/4 w-64 h-64 bg-[#00ff41]/5 blur-[100px] rounded-full" />
            <div className="absolute bottom-0 right-1/4 w-64 h-64 bg-blue-500/5 blur-[100px] rounded-full" />

            <div className="flex justify-between items-start mb-12">
              <div>
                <h2 className="text-3xl font-black text-white tracking-tighter italic">UPGRADE <span className="text-[#00ff41]">TERMINAL</span></h2>
                <p className="text-xs font-mono text-[#888] uppercase tracking-widest mt-2">Escolha seu plano de acesso ilimitado</p>
              </div>
              <button
                onClick={onClose}
                className="p-2 rounded-full hover:bg-white/5 text-[#444] hover:text-white transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Weekly Plan */}
              <div className="p-8 bg-black/40 rounded-3xl border border-[#222] hover:border-[#00ff41]/30 transition-all group relative">
                <div className="absolute top-4 right-4 p-2 rounded-lg bg-[#00ff41]/10 border border-[#00ff41]/20">
                  <Zap className="w-5 h-5 text-[#00ff41]" />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">Plano Semanal</h3>
                <div className="flex items-baseline gap-1 mb-6">
                  <span className="text-4xl font-black text-white">R$ 29,90</span>
                  <span className="text-[#444] font-mono text-sm">/SEMANA</span>
                </div>
                
                <ul className="space-y-4 mb-8">
                  <li className="flex items-center gap-3 text-sm text-[#888]">
                    <Check className="w-4 h-4 text-[#00ff41]" />
                    Análises Ilimitadas
                  </li>
                  <li className="flex items-center gap-3 text-sm text-[#888]">
                    <Check className="w-4 h-4 text-[#00ff41]" />
                    Prioridade no Processamento
                  </li>
                  <li className="flex items-center gap-3 text-sm text-[#888]">
                    <Check className="w-4 h-4 text-[#00ff41]" />
                    Suporte 24/7
                  </li>
                </ul>

                <button
                  onClick={() => handleCheckout('weekly')}
                  disabled={!!loading}
                  className="w-full py-4 rounded-2xl bg-white/5 border border-white/10 text-white font-bold hover:bg-[#00ff41] hover:text-black hover:border-[#00ff41] transition-all shadow-[0_0_20px_rgba(0,0,0,0.3)] flex items-center justify-center gap-2"
                >
                  {loading === 'weekly' ? <Loader2 className="w-5 h-5 animate-spin" /> : 'ASSINAR SEMANAL'}
                </button>
              </div>

              {/* Monthly Plan */}
              <div className="p-8 bg-[#00ff41]/5 rounded-3xl border border-[#00ff41]/30 hover:border-[#00ff41] transition-all group relative">
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 bg-[#00ff41] text-black text-[10px] font-black uppercase tracking-widest rounded-full">
                  MELHOR VALOR
                </div>
                <div className="absolute top-4 right-4 p-2 rounded-lg bg-[#00ff41]/20 border border-[#00ff41]/40">
                  <Crown className="w-5 h-5 text-[#00ff41]" />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">Plano Mensal</h3>
                <div className="flex items-baseline gap-1 mb-6">
                  <span className="text-4xl font-black text-white">R$ 49,90</span>
                  <span className="text-[#444] font-mono text-sm">/MÊS</span>
                </div>
                
                <ul className="space-y-4 mb-8">
                  <li className="flex items-center gap-3 text-sm text-[#888]">
                    <Check className="w-4 h-4 text-[#00ff41]" />
                    Tudo do Plano Semanal
                  </li>
                  <li className="flex items-center gap-3 text-sm text-[#888]">
                    <Check className="w-4 h-4 text-[#00ff41]" />
                    Acesso a Novos Modelos
                  </li>
                  <li className="flex items-center gap-3 text-sm text-[#888]">
                    <Check className="w-4 h-4 text-[#00ff41]" />
                    Economia de 40%
                  </li>
                </ul>

                <button
                  onClick={() => handleCheckout('monthly')}
                  disabled={!!loading}
                  className="w-full py-4 rounded-2xl bg-[#00ff41] text-black font-bold hover:bg-[#00cc33] transition-all shadow-[0_0_30px_rgba(0,255,65,0.2)] flex items-center justify-center gap-2"
                >
                  {loading === 'monthly' ? <Loader2 className="w-5 h-5 animate-spin" /> : 'ASSINAR MENSAL'}
                </button>
              </div>
            </div>

            <div className="mt-12 flex items-center justify-center gap-8 border-t border-[#222] pt-8">
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-[#444]" />
                <span className="text-[10px] font-mono text-[#444] uppercase tracking-widest">PAGAMENTO SEGURO</span>
              </div>
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-[#444]" />
                <span className="text-[10px] font-mono text-[#444] uppercase tracking-widest">ATIVAÇÃO INSTANTÂNEA</span>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
