import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, Mail, Lock, User, ArrowRight, Loader2, Key } from 'lucide-react';

interface AuthProps {
  onLogin: (user: any) => void;
}

type AuthMode = 'login' | 'register' | 'forgot';

const ServerStatus = () => {
  const [status, setStatus] = useState<'checking' | 'online' | 'offline'>('checking');

  useEffect(() => {
    fetch('/api/auth/me')
      .then(res => {
        const isJson = res.headers.get("content-type")?.includes("application/json");
        setStatus((res.status === 401 || res.ok) && isJson ? 'online' : 'offline');
      })
      .catch(() => setStatus('offline'));
  }, []);

  return (
    <div className="flex items-center gap-1.5 mt-2">
      <div className={`w-1.5 h-1.5 rounded-full ${
        status === 'online' ? 'bg-[#00ff41] shadow-[0_0_8px_#00ff41]' : 
        status === 'offline' ? 'bg-red-500 shadow-[0_0_8px_#ef4444]' : 
        'bg-yellow-500 animate-pulse'
      }`} />
      <span className="text-[8px] font-mono text-[#444] uppercase tracking-widest">
        {status === 'online' ? 'SERVIDOR ONLINE' : status === 'offline' ? 'SERVIDOR OFFLINE' : 'VERIFICANDO...'}
      </span>
    </div>
  );
};

export const Auth: React.FC<AuthProps> = ({ onLogin }) => {
  const [mode, setMode] = useState<AuthMode>('login');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    email: '',
    password: '',
    name: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      if (mode === 'login') {
        console.log("Iniciando login...");
        const res = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ email: formData.email, password: formData.password }),
        });
        console.log("Resposta do login recebida:", res.status);
        const contentType = res.headers.get("content-type");
        if (!contentType || !contentType.includes("application/json")) {
          const text = await res.text();
          console.error("Resposta não-JSON recebida no login:", text.substring(0, 200));
          throw new Error(`Erro do Servidor: Resposta inválida (${res.status}). Verifique o console.`);
        }
        
        const data = await res.json();
        if (!res.ok) {
          console.error("Erro no login:", data.error);
          let errorMessage = data.error || 'Erro ao entrar';
          if (errorMessage === "Credenciais inválidas") {
            errorMessage = "Email ou senha incorretos. Verifique seus dados ou cadastre-se.";
          }
          throw new Error(errorMessage);
        }
        console.log("Login bem-sucedido, salvando token...");
        if (data.token) {
          try {
            localStorage.setItem('rico_token', data.token);
          } catch (e) {}
        }
        onLogin(data.user);
      } else if (mode === 'register') {
        const res = await fetch('/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(formData),
        });
        const contentType = res.headers.get("content-type");
        if (!contentType || !contentType.includes("application/json")) {
          const text = await res.text();
          console.error("Resposta não-JSON recebida no registro:", text.substring(0, 200));
          throw new Error(`Erro do Servidor: Resposta inválida (${res.status}). Verifique o console.`);
        }
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Erro ao cadastrar');
        setSuccess('Cadastro realizado! Agora faça o login.');
        setMode('login');
      } else if (mode === 'forgot') {
        const res = await fetch('/api/auth/recover', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: formData.email }),
        });
        const data = await res.json();
        setSuccess(data.message);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-[#00ff41]/5 blur-[120px] rounded-full pointer-events-none" />
      
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md bg-[#141414] rounded-3xl terminal-border p-8 relative z-10"
      >
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 bg-[#00ff41]/10 rounded-2xl flex items-center justify-center border border-[#00ff41]/30 mb-4">
            <Shield className="text-[#00ff41] w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold tracking-tighter text-white">
            R.I.C.O. <span className="text-[#00ff41]">ANÁLISE</span>
          </h1>
          <p className="text-xs font-mono text-[#888] uppercase tracking-widest mt-1">
            {mode === 'login' ? 'ACESSO AO SISTEMA' : mode === 'register' ? 'CRIAR NOVA CONTA' : 'RECUPERAR ACESSO'}
          </p>
          <ServerStatus />
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <AnimatePresence mode="wait">
            {mode === 'register' && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="space-y-1"
              >
                <label className="text-[10px] font-mono text-[#888] uppercase tracking-widest ml-1">Nome Completo</label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#444]" />
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full bg-black/40 border border-[#222] rounded-xl py-3 pl-12 pr-4 text-white placeholder:text-[#444] focus:border-[#00ff41]/50 focus:ring-1 focus:ring-[#00ff41]/50 outline-none transition-all"
                    placeholder="Seu nome"
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="space-y-1">
            <label className="text-[10px] font-mono text-[#888] uppercase tracking-widest ml-1">Email Corporativo</label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#444]" />
              <input
                type="email"
                required
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full bg-black/40 border border-[#222] rounded-xl py-3 pl-12 pr-4 text-white placeholder:text-[#444] focus:border-[#00ff41]/50 focus:ring-1 focus:ring-[#00ff41]/50 outline-none transition-all"
                placeholder="exemplo@email.com"
              />
            </div>
          </div>

          {mode !== 'forgot' && (
            <div className="space-y-1">
              <label className="text-[10px] font-mono text-[#888] uppercase tracking-widest ml-1">Chave de Acesso</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#444]" />
                <input
                  type="password"
                  required
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="w-full bg-black/40 border border-[#222] rounded-xl py-3 pl-12 pr-4 text-white placeholder:text-[#444] focus:border-[#00ff41]/50 focus:ring-1 focus:ring-[#00ff41]/50 outline-none transition-all"
                  placeholder="••••••••"
                />
              </div>
            </div>
          )}

          {error && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-xs text-red-500 font-mono text-center"
            >
              {error}
            </motion.p>
          )}

          {success && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-xs text-[#00ff41] font-mono text-center"
            >
              {success}
            </motion.p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#00ff41] text-black font-bold py-3 rounded-xl hover:bg-[#00cc33] transition-all flex items-center justify-center gap-2 disabled:opacity-50 shadow-[0_0_20px_rgba(0,255,65,0.2)]"
          >
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <>
                {mode === 'login' ? 'ENTRAR NO TERMINAL' : mode === 'register' ? 'CRIAR CONTA' : 'ENVIAR INSTRUÇÕES'}
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-[#222] flex flex-col gap-3">
          {mode === 'login' ? (
            <>
              <button
                onClick={() => setMode('register')}
                className="text-xs font-mono text-[#888] hover:text-[#00ff41] transition-colors text-center"
              >
                NÃO TEM CONTA? <span className="text-white">CADASTRE-SE</span>
              </button>
              <button
                onClick={() => setMode('forgot')}
                className="text-xs font-mono text-[#444] hover:text-[#888] transition-colors text-center"
              >
                ESQUECEU A SENHA?
              </button>
              <button
                onClick={() => {
                  localStorage.clear();
                  window.location.reload();
                }}
                className="text-[8px] font-mono text-[#222] hover:text-[#444] transition-colors text-center mt-2"
              >
                LIMPAR CACHE DO TERMINAL
              </button>
            </>
          ) : (
            <button
              onClick={() => setMode('login')}
              className="text-xs font-mono text-[#888] hover:text-[#00ff41] transition-colors text-center"
            >
              JÁ TEM CONTA? <span className="text-white">FAÇA LOGIN</span>
            </button>
          )}
        </div>

        <div className="mt-6 p-4 bg-[#00ff41]/5 rounded-2xl border border-[#00ff41]/10 flex flex-col items-center gap-2">
          <p className="text-[9px] font-mono text-[#444] uppercase tracking-widest">Planos Profissionais</p>
          <div className="flex gap-4">
            <div className="text-center">
              <p className="text-[10px] font-bold text-white">SEMANAL</p>
              <p className="text-[10px] text-[#00ff41]">R$ 29,90</p>
            </div>
            <div className="w-px h-8 bg-[#222]" />
            <div className="text-center">
              <p className="text-[10px] font-bold text-white">MENSAL</p>
              <p className="text-[10px] text-[#00ff41]">R$ 49,90</p>
            </div>
          </div>
          <p className="text-[8px] text-[#444] text-center mt-1">Acesso ilimitado e processamento prioritário após o login.</p>
          <div className="mt-2 p-2 bg-white/5 rounded-lg border border-white/5">
            <p className="text-[7px] font-mono text-[#333] text-center uppercase tracking-widest">Acesso de Recuperação:</p>
            <p className="text-[7px] font-mono text-[#00ff41]/50 text-center">admin@rico.com / admin123</p>
          </div>
        </div>
      </motion.div>

      <div className="absolute bottom-8 text-[10px] font-mono text-[#222] uppercase tracking-[0.3em]">
        QUANTUM ENCRYPTION ACTIVE
      </div>
    </div>
  );
};
