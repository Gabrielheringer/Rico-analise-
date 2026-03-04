import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { CameraView } from './components/CameraView';
import { AnalysisPanel } from './components/AnalysisPanel';
import { Auth } from './components/auth/Auth';
import { AnalysisHistory } from './components/AnalysisHistory';
import { SettingsModal, UserSettings } from './components/SettingsModal';
import { PricingModal } from './components/PricingModal';
import { MobileInstallModal } from './components/MobileInstallModal';
import { GlobalSignalFeed } from './components/GlobalSignalFeed';
import { analyzeChart, AnalysisResult } from './services/gemini';
import { motion, AnimatePresence } from 'framer-motion';
import { LayoutGrid, History, Settings, Bell, Loader2, Sparkles, Lock, Crown } from 'lucide-react';

const DEFAULT_SETTINGS: UserSettings = {
  minConfidence: 70,
  minStrength: 60,
  enableAlerts: true,
};

const compressImage = (base64Str: string, maxWidth = 1920, maxHeight = 1080): Promise<string> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.src = base64Str;
    img.onload = () => {
      const canvas = document.createElement('canvas');
      let width = img.width;
      let height = img.height;

      if (width > height) {
        if (width > maxWidth) {
          height *= maxWidth / width;
          width = maxWidth;
        }
      } else {
        if (height > maxHeight) {
          width *= maxHeight / height;
          height = maxHeight;
        }
      }

      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx?.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL('image/jpeg', 0.8));
    };
  });
};

export default function App() {
  const [user, setUser] = useState<any>(null);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  // Pricing State
  const [isPricingOpen, setIsPricingOpen] = useState(false);
  const [isInstallOpen, setIsInstallOpen] = useState(false);

  // Settings State
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [settings, setSettings] = useState<UserSettings>(() => {
    try {
      const saved = localStorage.getItem('rico_settings');
      return saved ? JSON.parse(saved) : DEFAULT_SETTINGS;
    } catch (e) {
      return DEFAULT_SETTINGS;
    }
  });

  useEffect(() => {
    checkAuth();
    
    // Handle Mercado Pago return
    const urlParams = new URLSearchParams(window.location.search);
    const paymentStatus = urlParams.get('payment');
    const plan = urlParams.get('plan') as 'weekly' | 'monthly';

    if (paymentStatus === 'success' && plan) {
      window.history.replaceState({}, document.title, "/");
      handleUpgrade(plan).then(() => {
        // We use a small delay to ensure state is updated
        setTimeout(() => alert('Pagamento aprovado! Seu acesso ilimitado foi ativado.'), 500);
      });
    } else if (paymentStatus === 'failure') {
      window.history.replaceState({}, document.title, "/");
      alert('O pagamento não pôde ser processado. Tente novamente.');
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('rico_settings', JSON.stringify(settings));
  }, [settings]);

  const checkAuth = async () => {
    try {
      let token = null;
      try {
        token = localStorage.getItem('rico_token');
      } catch (e) {}
      
      const res = await fetch('/api/auth/me', { 
        credentials: 'include',
        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
      });
      
      if (res.ok) {
        const contentType = res.headers.get("content-type");
        if (contentType && contentType.includes("application/json")) {
          const data = await res.json();
          setUser(data.user);
        } else {
          console.error("Auth check: Resposta não-JSON recebida");
        }
      } else {
        if (res.status === 401) {
          try {
            localStorage.removeItem('rico_token');
          } catch (e) {}
          setUser(null);
        }
      }
    } catch (err) {
      console.error('Auth check failed:', err);
    } finally {
      setCheckingAuth(false);
    }
  };

  const handleLogout = async () => {
    const token = localStorage.getItem('rico_token');
    await fetch('/api/auth/logout', { 
      method: 'POST', 
      credentials: 'include',
      headers: token ? { 'Authorization': `Bearer ${token}` } : {}
    });
    localStorage.removeItem('rico_token');
    setUser(null);
  };

  const handleUpgrade = async (planType: 'weekly' | 'monthly') => {
    try {
      const token = localStorage.getItem('rico_token');
      const res = await fetch('/api/subscription/upgrade', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        credentials: 'include',
        body: JSON.stringify({ planType }),
      });
      const contentType = res.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        throw new Error("O servidor retornou uma resposta inválida (não-JSON).");
      }
      const data = await res.json();
      if (res.ok) {
        setUser({ ...user, plan: data.plan, plan_expires_at: data.expiresAt });
        setIsPricingOpen(false);
      } else {
        if (res.status === 401) {
          localStorage.removeItem('rico_token');
          setUser(null);
        }
        alert(data.error);
      }
    } catch (err) {
      console.error('Upgrade failed');
    }
  };

  const handleCapture = async (image: string) => {
    const isSubscribed = user.plan === 'pro' || user.email === 'admin@rico.com' || (user.plan !== 'free' && user.plan_expires_at && new Date(user.plan_expires_at) > new Date());
    
    if (!isSubscribed && user.analysis_count >= 2) {
      setIsPricingOpen(true);
      return;
    }

    setIsAnalyzing(true);
    setError(null);
    try {
      const token = localStorage.getItem('rico_token');
      
      // 1. Check if user can analyze
      const checkRes = await fetch('/api/analysis/check', { 
        method: 'GET',
        credentials: 'include',
        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
      });
      
      const checkContentType = checkRes.headers.get("content-type");
      if (!checkContentType || !checkContentType.includes("application/json")) {
        throw new Error("O servidor retornou uma resposta inválida (não-JSON).");
      }
      
      const checkData = await checkRes.json();
      
      if (!checkRes.ok) {
        if (checkRes.status === 403) {
          setIsPricingOpen(true);
          setIsAnalyzing(false);
          return;
        }
        if (checkRes.status === 401) {
          localStorage.removeItem('rico_token');
          setUser(null);
          throw new Error("Sua sessão expirou. Por favor, faça login novamente.");
        }
        throw new Error(checkData.error || "Erro ao verificar créditos.");
      }

      // 2. Perform analysis
      console.log("Comprimindo imagem para análise...");
      const compressedImage = await compressImage(image);
      
      console.log("Enviando para o modelo de IA...");
      
      // Retry logic for analyzeChart
      let data: AnalysisResult | null = null;
      let retries = 2;
      while (retries >= 0) {
        try {
          data = await analyzeChart(compressedImage);
          break;
        } catch (aiErr) {
          if (retries === 0) throw aiErr;
          console.warn(`Análise falhou, tentando novamente... (${retries} tentativas restantes)`);
          retries--;
          await new Promise(r => setTimeout(r, 1000));
        }
      }

      if (!data) throw new Error("Falha ao gerar análise.");
      
      setResult(data);
      
      // 3. Increment count on server (only after successful analysis)
      const incRes = await fetch('/api/analysis/increment', { 
        method: 'POST',
        credentials: 'include',
        headers: { 
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          trend: data.trend,
          confidence: data.confidence,
          entryM1: data.entryM1,
          entryM5: data.entryM5,
          rationale: data.rationale
        })
      });
      
      if (incRes.ok) {
        const incData = await incRes.json();
        setUser({ ...user, analysis_count: incData.analysis_count });
      }
    } catch (err: any) {
      console.error('Erro na análise:', err);
      let msg = err instanceof Error ? err.message : "Erro desconhecido";
      if (msg.includes("API key not valid")) {
        msg = "Chave de API Gemini Inválida. Por favor, verifique se a sua GEMINI_API_KEY está configurada corretamente no painel de Secrets (ícone de cadeado) do AI Studio.";
      }
      setError(msg);
      setResult(null);
    } finally {
      setIsAnalyzing(false);
    }
  };

  if (checkingAuth) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-[#00ff41] animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <Auth onLogin={setUser} />;
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex flex-col">
      <Header 
        user={user} 
        onLogout={handleLogout} 
        onOpenPricing={() => setIsPricingOpen(true)} 
        onOpenInstall={() => setIsInstallOpen(true)}
      />
      
      <main className="flex-1 container mx-auto px-4 py-8 max-w-6xl">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Left Column: Camera and Controls */}
          <div className="lg:col-span-7 space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <LayoutGrid className="w-4 h-4 text-[#00ff41]" />
                <h2 className="text-sm font-mono text-[#888] uppercase tracking-widest">TERMINAL DE CAPTURA</h2>
              </div>
              <div className="flex gap-2">
                <button className="p-2 rounded-lg bg-[#141414] border border-[#222] text-[#888] hover:text-white transition-colors">
                  <Bell className="w-4 h-4" />
                </button>
                <button 
                  onClick={() => setIsPricingOpen(true)}
                  className="p-2 rounded-lg bg-[#141414] border border-[#222] text-[#888] hover:text-[#00ff41] transition-colors flex items-center gap-2 px-3"
                  title="Ver Planos"
                >
                  <Sparkles className="w-4 h-4" />
                  <span className="text-[9px] font-black uppercase tracking-widest hidden sm:inline">Planos</span>
                </button>
                <button 
                  onClick={() => setIsSettingsOpen(true)}
                  className="p-2 rounded-lg bg-[#141414] border border-[#222] text-[#888] hover:text-white transition-colors"
                >
                  <Settings className="w-4 h-4" />
                </button>
              </div>
            </div>

            <CameraView onCapture={handleCapture} isAnalyzing={isAnalyzing} />

            {user.plan === 'free' && user.email !== 'admin@rico.com' && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-8 p-4 bg-gradient-to-r from-[#00ff41]/20 to-blue-500/10 border border-[#00ff41]/30 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-[#00ff41]/20 rounded-xl flex items-center justify-center border border-[#00ff41]/40">
                    <Crown className="text-[#00ff41] w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-white font-bold text-sm">DESBLOQUEIE O PODER TOTAL</h3>
                    <p className="text-[#888] text-[10px] font-mono uppercase tracking-widest">Análises ilimitadas e processamento prioritário</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsPricingOpen(true)}
                  className="w-full sm:w-auto px-6 py-2.5 bg-[#00ff41] text-black font-black text-[10px] uppercase tracking-widest rounded-xl hover:bg-[#00cc33] transition-all shadow-[0_0_20px_rgba(0,255,65,0.2)]"
                >
                  VER PLANOS DISPONÍVEIS
                </button>
              </motion.div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-4 bg-[#141414] rounded-xl terminal-border flex flex-col items-center justify-center">
                <p className="text-[10px] font-mono text-[#444] uppercase tracking-widest mb-1">STATUS CONTA</p>
                <div className="flex items-center gap-2">
                  {user.plan === 'free' && user.email !== 'admin@rico.com' ? (
                    <span className="text-xs font-bold text-white uppercase">FREE</span>
                  ) : (
                    <div className="flex items-center gap-1">
                      <Sparkles className="w-3 h-3 text-[#00ff41]" />
                      <span className="text-xs font-bold text-[#00ff41] uppercase">{user.email === 'admin@rico.com' ? 'ADMIN' : user.plan}</span>
                    </div>
                  )}
                </div>
              </div>
              <div className="p-4 bg-[#141414] rounded-xl terminal-border flex flex-col items-center justify-center relative overflow-hidden group">
                <p className="text-[10px] font-mono text-[#444] uppercase tracking-widest mb-1">ANÁLISES RESTANTES</p>
                <div className="flex items-center gap-2">
                  {user.plan === 'free' && user.email !== 'admin@rico.com' ? (
                    <div className="flex flex-col items-center">
                      <span className="text-sm font-mono text-[#00ff41]">{Math.max(0, 2 - user.analysis_count)}/2</span>
                      <button 
                        onClick={() => setIsPricingOpen(true)}
                        className="mt-2 text-[9px] font-black text-[#00ff41] border border-[#00ff41]/30 px-2 py-1 rounded hover:bg-[#00ff41] hover:text-black transition-all"
                      >
                        UPGRADE
                      </button>
                    </div>
                  ) : (
                    <span className="text-sm font-mono text-[#00ff41]">ILIMITADO</span>
                  )}
                </div>
              </div>
              <div className="p-4 bg-[#141414] rounded-xl terminal-border flex flex-col items-center justify-center">
                <p className="text-[10px] font-mono text-[#444] uppercase tracking-widest mb-1">UPTIME IA</p>
                <p className="text-sm font-mono text-[#00ff41]">99.9%</p>
              </div>
            </div>

            {user.plan === 'free' && user.email !== 'admin@rico.com' && user.analysis_count >= 2 && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-6 bg-[#00ff41]/5 border border-[#00ff41]/20 rounded-2xl flex flex-col items-center text-center gap-4"
              >
                <div className="p-3 rounded-full bg-[#00ff41]/10">
                  <Lock className="w-6 h-6 text-[#00ff41]" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">Limite Gratuito Atingido</h3>
                  <p className="text-sm text-[#888] mt-1">Você já utilizou suas 2 análises gratuitas. Faça o upgrade para continuar operando com o R.I.C.O.</p>
                </div>
                <button
                  onClick={() => setIsPricingOpen(true)}
                  className="px-8 py-3 rounded-xl bg-[#00ff41] text-black font-bold hover:bg-[#00cc33] transition-all shadow-[0_0_20px_rgba(0,255,65,0.2)]"
                >
                  VER PLANOS DISPONÍVEIS
                </button>
              </motion.div>
            )}
          </div>

          {/* Right Column: Analysis Results */}
          <div className="lg:col-span-5 space-y-6">
            <div className="flex items-center gap-2">
              <History className="w-4 h-4 text-[#00ff41]" />
              <h2 className="text-sm font-mono text-[#888] uppercase tracking-widest">RELATÓRIO DE ANÁLISE</h2>
            </div>

            <AnalysisPanel 
              result={result} 
              error={error} 
              settings={settings} 
              onOpenPricing={() => setIsPricingOpen(true)}
              onRetry={() => {
                setResult(null);
                setError(null);
                // Scroll to camera on mobile
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
            />

            <GlobalSignalFeed />

            <AnalysisHistory analysisCount={user.analysis_count} />

            {/* Disclaimer */}
            <div className="p-4 bg-yellow-500/5 border border-yellow-500/20 rounded-xl">
              <p className="text-[10px] text-yellow-500/60 leading-tight">
                AVISO: O mercado financeiro envolve riscos. Esta ferramenta utiliza IA para análise técnica e não garante lucros. Use como auxílio à sua própria estratégia.
              </p>
            </div>
          </div>

        </div>
      </main>

      <SettingsModal 
        isOpen={isSettingsOpen} 
        onClose={() => setIsSettingsOpen(false)} 
        settings={settings}
        onSave={setSettings}
      />

      <PricingModal
        isOpen={isPricingOpen}
        onClose={() => setIsPricingOpen(false)}
        onSelectPlan={handleUpgrade}
      />

      <MobileInstallModal
        isOpen={isInstallOpen}
        onClose={() => setIsInstallOpen(false)}
      />

      <footer className="py-6 border-t border-[#222] bg-[#0a0a0a]">
        <div className="container mx-auto px-4 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-[10px] font-mono text-[#444] uppercase tracking-widest">
            © 2026 R.I.C.O. ANALISE - QUANTUM TRADING SYSTEMS
          </p>
          <div className="flex gap-6">
            <button 
              onClick={() => setIsPricingOpen(true)}
              className="text-[10px] font-mono text-[#444] hover:text-[#00ff41] transition-colors uppercase"
            >
              PLANOS
            </button>
            <button 
              onClick={() => setIsInstallOpen(true)}
              className="text-[10px] font-mono text-[#444] hover:text-[#00ff41] transition-colors uppercase"
            >
              INSTALAR APP
            </button>
            <a href="#" className="text-[10px] font-mono text-[#444] hover:text-[#00ff41] transition-colors">TERMOS</a>
            <a href="#" className="text-[10px] font-mono text-[#444] hover:text-[#00ff41] transition-colors">PRIVACIDADE</a>
            <a href="#" className="text-[10px] font-mono text-[#444] hover:text-[#00ff41] transition-colors">SUPORTE</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
