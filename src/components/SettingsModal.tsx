import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Sliders, ShieldCheck, Zap, BellRing } from 'lucide-react';

export interface UserSettings {
  minConfidence: number;
  minStrength: number;
  enableAlerts: boolean;
}

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: UserSettings;
  onSave: (settings: UserSettings) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose, settings, onSave }) => {
  const [localSettings, setLocalSettings] = React.useState<UserSettings>(settings);

  React.useEffect(() => {
    setLocalSettings(settings);
  }, [settings]);

  const handleSave = () => {
    onSave(localSettings);
    onClose();
  };

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
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-md bg-[#141414] rounded-3xl terminal-border p-8 overflow-hidden"
          >
            {/* Background Glow */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-[#00ff41]/5 blur-3xl rounded-full" />

            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-[#00ff41]/10 border border-[#00ff41]/20">
                  <Sliders className="w-5 h-5 text-[#00ff41]" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white tracking-tight">Configurações</h2>
                  <p className="text-[10px] font-mono text-[#888] uppercase tracking-widest">Parâmetros do Sistema</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 rounded-full hover:bg-white/5 text-[#444] hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-8">
              {/* Confidence Threshold */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-[#00ff41]" />
                    <label className="text-xs font-mono text-[#888] uppercase tracking-widest">Confiança Mínima</label>
                  </div>
                  <span className="text-sm font-mono text-white">{localSettings.minConfidence}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={localSettings.minConfidence}
                  onChange={(e) => setLocalSettings({ ...localSettings, minConfidence: parseInt(e.target.value) })}
                  className="w-full h-1 bg-[#222] rounded-full appearance-none cursor-pointer accent-[#00ff41]"
                />
                <p className="text-[10px] text-[#444]">Filtra sinais com base na precisão estimada pela IA.</p>
              </div>

              {/* Strength Threshold */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Zap className="w-4 h-4 text-[#00ff41]" />
                    <label className="text-xs font-mono text-[#888] uppercase tracking-widest">Força Mínima</label>
                  </div>
                  <span className="text-sm font-mono text-white">{localSettings.minStrength}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={localSettings.minStrength}
                  onChange={(e) => setLocalSettings({ ...localSettings, minStrength: parseInt(e.target.value) })}
                  className="w-full h-1 bg-[#222] rounded-full appearance-none cursor-pointer accent-[#00ff41]"
                />
                <p className="text-[10px] text-[#444]">Filtra sinais com base na intensidade da tendência detectada.</p>
              </div>

              {/* Toggle Alerts */}
              <div className="flex items-center justify-between p-4 bg-black/40 rounded-2xl border border-white/5">
                <div className="flex items-center gap-3">
                  <BellRing className="w-5 h-5 text-[#00ff41]" />
                  <div>
                    <p className="text-xs font-bold text-white">Alertas Visuais</p>
                    <p className="text-[10px] text-[#444]">Destacar sinais que cumprem os requisitos.</p>
                  </div>
                </div>
                <button
                  onClick={() => setLocalSettings({ ...localSettings, enableAlerts: !localSettings.enableAlerts })}
                  className={`w-12 h-6 rounded-full transition-colors relative ${localSettings.enableAlerts ? 'bg-[#00ff41]' : 'bg-[#222]'}`}
                >
                  <motion.div
                    animate={{ x: localSettings.enableAlerts ? 26 : 4 }}
                    className="absolute top-1 w-4 h-4 bg-white rounded-full shadow-sm"
                  />
                </button>
              </div>
            </div>

            <div className="mt-10">
              <button
                onClick={handleSave}
                className="w-full bg-[#00ff41] text-black font-bold py-4 rounded-2xl hover:bg-[#00cc33] transition-all shadow-[0_0_20px_rgba(0,255,65,0.2)]"
              >
                SALVAR PARÂMETROS
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
