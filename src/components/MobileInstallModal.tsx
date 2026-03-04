import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Smartphone, Share, PlusSquare, Chrome, MoreVertical } from 'lucide-react';

interface MobileInstallModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const MobileInstallModal: React.FC<MobileInstallModalProps> = ({ isOpen, onClose }) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
          />
          
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="relative w-full max-w-md bg-[#141414] border border-[#222] rounded-3xl p-6 overflow-hidden"
          >
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-[#00ff41] to-transparent opacity-50" />
            
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-[#00ff41]/10 rounded-lg border border-[#00ff41]/20">
                  <Smartphone className="w-5 h-5 text-[#00ff41]" />
                </div>
                <h2 className="text-lg font-bold text-white tracking-tight">INSTALAR APP</h2>
              </div>
              <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-full transition-colors">
                <X className="w-5 h-5 text-[#444]" />
              </button>
            </div>

            <div className="space-y-6">
              {/* iOS Instructions */}
              <div className="p-4 bg-white/5 rounded-2xl border border-white/5">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-6 h-6 rounded-full bg-blue-500/20 flex items-center justify-center">
                    <span className="text-[10px] font-bold text-blue-400">iOS</span>
                  </div>
                  <h3 className="text-sm font-bold text-white">iPhone / iPad (Safari)</h3>
                </div>
                <ol className="space-y-3 text-xs text-[#888] font-mono">
                  <li className="flex gap-3">
                    <span className="text-[#00ff41]">01.</span>
                    <div className="flex items-center gap-1">
                      Toque no ícone de <Share className="w-3 h-3 inline text-blue-400" /> Compartilhar
                    </div>
                  </li>
                  <li className="flex gap-3">
                    <span className="text-[#00ff41]">02.</span>
                    <span>Role para baixo e selecione "Adicionar à Tela de Início"</span>
                  </li>
                  <li className="flex gap-3">
                    <span className="text-[#00ff41]">03.</span>
                    <div className="flex items-center gap-1">
                      Toque em "Adicionar" no canto superior direito
                    </div>
                  </li>
                </ol>
              </div>

              {/* Android Instructions */}
              <div className="p-4 bg-white/5 rounded-2xl border border-white/5">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-6 h-6 rounded-full bg-green-500/20 flex items-center justify-center">
                    <Chrome className="w-3 h-3 text-green-400" />
                  </div>
                  <h3 className="text-sm font-bold text-white">Android (Chrome)</h3>
                </div>
                <ol className="space-y-3 text-xs text-[#888] font-mono">
                  <li className="flex gap-3">
                    <span className="text-[#00ff41]">01.</span>
                    <div className="flex items-center gap-1">
                      Toque nos <MoreVertical className="w-3 h-3 inline text-white" /> três pontos no canto superior
                    </div>
                  </li>
                  <li className="flex gap-3">
                    <span className="text-[#00ff41]">02.</span>
                    <span>Selecione "Instalar aplicativo" ou "Adicionar à tela inicial"</span>
                  </li>
                  <li className="flex gap-3">
                    <span className="text-[#00ff41]">03.</span>
                    <span>Confirme a instalação no pop-up do sistema</span>
                  </li>
                </ol>
              </div>
            </div>

            <div className="mt-8 p-4 bg-[#00ff41]/5 rounded-2xl border border-[#00ff41]/10">
              <p className="text-[10px] text-[#00ff41] text-center font-mono uppercase tracking-widest leading-relaxed">
                O APP SERÁ INSTALADO COMO UM APLICATIVO NATIVO, COM ACESSO RÁPIDO E MELHOR PERFORMANCE.
              </p>
            </div>

            <button
              onClick={onClose}
              className="w-full mt-6 py-3 bg-[#222] text-white text-xs font-bold rounded-xl hover:bg-[#333] transition-colors uppercase tracking-widest"
            >
              Entendido
            </button>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
