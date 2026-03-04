import express from "express";
import "dotenv/config";
import { createServer as createViteServer } from "vite";
import Database from "better-sqlite3";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import cookieParser from "cookie-parser";
import cors from "cors";
import { MercadoPagoConfig, Preference } from 'mercadopago';
import path from "path";
import { fileURLToPath } from "url";
import { createClient } from '@supabase/supabase-js';
import { createServer } from "http";
import { Server } from "socket.io";

console.log(">>> SERVER.TS INICIANDO <<<");

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.join(__dirname, "database.sqlite");
const localDb = new Database(dbPath, { timeout: 10000 });
localDb.pragma('journal_mode = WAL');
localDb.pragma('synchronous = NORMAL');

// Supabase Configuration
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
const supabase = (supabaseUrl && supabaseAnonKey) ? createClient(supabaseUrl, supabaseAnonKey) : null;
const isSupabase = !!supabase;

if (isSupabase) {
  console.log(">>> SUPABASE CONECTADO COMO BANCO PRINCIPAL <<<");
  
  // Seed Supabase accounts
  (async () => {
    try {
      const masterEmail = "admin@rico.com";
      const { data: existingAdmin } = await supabase!.from('users').select('id').eq('email', masterEmail).single();
      if (!existingAdmin) {
        const hashed = bcrypt.hashSync("admin123", 10);
        await supabase!.from('users').insert([{ email: masterEmail, password: hashed, name: "Administrador", plan: "pro" }]);
        console.log("Conta mestre Supabase criada.");
      }

      const userEmail = "gabriel3heringer@gmail.com";
      const { data: existingUser } = await supabase!.from('users').select('id').eq('email', userEmail).single();
      if (!existingUser) {
        const hashed = bcrypt.hashSync("123456", 10);
        await supabase!.from('users').insert([{ email: userEmail, password: hashed, name: "Gabriel", plan: "free" }]);
        console.log("Conta usuário Supabase criada.");
      }
    } catch (e) {
      console.error("Erro ao realizar seed no Supabase:", e);
    }
  })();
} else {
  console.log(">>> SUPABASE NÃO CONFIGURADO. USANDO SQLITE LOCAL <<<");
}

const JWT_SECRET = process.env.JWT_SECRET || "rico-secret-key-2026";

// Mercado Pago Configuration
const mpClient = new MercadoPagoConfig({ 
  accessToken: process.env.MP_ACCESS_TOKEN || 'APP_USR-5922362960743721-022700-749384091a3e5d6373ef70509a30a067-3231099740' 
});

// Initialize local database
try {
  localDb.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      name TEXT NOT NULL,
      recovery_token TEXT,
      analysis_count INTEGER DEFAULT 0,
      plan TEXT DEFAULT 'free',
      plan_expires_at DATETIME
    );
    CREATE TABLE IF NOT EXISTS analyses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      trend TEXT NOT NULL,
      confidence INTEGER NOT NULL,
      entry_m1 TEXT NOT NULL,
      entry_m5 TEXT NOT NULL,
      rationale TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users (id)
    );
  `);

  // Migration: Add rationale column if it doesn't exist
  try {
    localDb.prepare("ALTER TABLE analyses ADD COLUMN rationale TEXT").run();
    console.log("Coluna 'rationale' adicionada à tabela 'analyses'.");
  } catch (e) {
    // Column already exists or table doesn't exist yet
  }

  console.log("Banco de dados local inicializado.");

  // Create master accounts if they don't exist
  try {
    const masterEmail = "admin@rico.com";
    const masterPass = "admin123";
    const existing = localDb.prepare("SELECT id FROM users WHERE email = ?").get(masterEmail);
    if (!existing) {
      const hashed = bcrypt.hashSync(masterPass, 10);
      localDb.prepare("INSERT INTO users (email, password, name, plan) VALUES (?, ?, ?, ?)").run(masterEmail, hashed, "Administrador", "pro");
      console.log("Conta mestre local criada: admin@rico.com / admin123");
    }

    // Create Gabriel account if it doesn't exist
    const userEmail = "gabriel3heringer@gmail.com";
    const userPass = "123456";
    const existingUser = localDb.prepare("SELECT id FROM users WHERE email = ?").get(userEmail);
    if (!existingUser) {
      const hashed = bcrypt.hashSync(userPass, 10);
      localDb.prepare("INSERT INTO users (email, password, name, plan) VALUES (?, ?, ?, ?)").run(userEmail, hashed, "Gabriel", "free");
      console.log("Conta usuário local criada: gabriel3heringer@gmail.com / 123456");
    }
  } catch (e) {
    console.error("Erro ao criar contas iniciais locais:", e);
  }
} catch (dbErr) {
  console.error("Erro ao inicializar banco de dados local:", dbErr);
}

// Test bcryptjs
try {
  const testPass = "test1234";
  const hash = bcrypt.hashSync(testPass, 10);
  const match = bcrypt.compareSync(testPass, hash);
  console.log(`BcryptJS Test: ${match ? "PASS" : "FAIL"}`);
} catch (err) {
  console.error("BcryptJS Test Error:", err);
}

async function startServer() {
  const app = express();
  const httpServer = createServer(app);
  const io = new Server(httpServer, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"]
    }
  });
  const PORT = 3000;

  let onlineUsers = 0;

  io.on("connection", (socket) => {
    onlineUsers++;
    io.emit("presence_update", { online: onlineUsers });
    console.log(`Usuário conectado. Online: ${onlineUsers}`);

    socket.on("disconnect", () => {
      onlineUsers = Math.max(0, onlineUsers - 1);
      io.emit("presence_update", { online: onlineUsers });
      console.log(`Usuário desconectado. Online: ${onlineUsers}`);
    });
  });

  app.use(express.json());
  app.use(cookieParser());
  app.use(cors({
    origin: true,
    credentials: true
  }));

  // Health check
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", time: new Date().toISOString() });
  });

  // Request logger
  app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
    next();
  });

  // Auth Routes
  app.post(["/api/auth/register", "/api/auth/register/"], async (req, res) => {
    const { email, password, name } = req.body;
    if (!email || !password || !name) {
      return res.status(400).json({ error: "Todos os campos são obrigatórios" });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: "A senha deve ter pelo menos 6 caracteres" });
    }
    const normalizedEmail = email.trim().toLowerCase();
    console.log(`Tentativa de registro: ${normalizedEmail}`);
    
    try {
      const hashedPassword = bcrypt.hashSync(password, 10);
      
      if (isSupabase && supabase) {
        const { error } = await supabase.from('users').insert([
          { email: normalizedEmail, password: hashedPassword, name, plan: 'free', analysis_count: 0 }
        ]);
        if (error) throw error;
      } else {
        const stmt = localDb.prepare("INSERT INTO users (email, password, name) VALUES (?, ?, ?)");
        stmt.run(normalizedEmail, hashedPassword, name);
      }

      console.log(`Usuário registrado com sucesso: ${normalizedEmail}`);
      res.status(201).json({ message: "Usuário criado com sucesso" });
    } catch (err: any) {
      console.error(`Erro no registro (${normalizedEmail}):`, err);
      if (err.code === "SQLITE_CONSTRAINT" || err.code === "23505") {
        return res.status(400).json({ error: "Email já cadastrado" });
      }
      res.status(500).json({ error: "Erro ao criar usuário" });
    }
  });

  app.post(["/api/auth/login", "/api/auth/login/"], async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: "Email e senha são obrigatórios" });
    }
    const normalizedEmail = email.trim().toLowerCase();
    console.log(`Tentativa de login para: ${normalizedEmail}`);
    
    try {
      let user: any;

      if (isSupabase && supabase) {
        const { data, error } = await supabase.from('users').select('*').eq('email', normalizedEmail).single();
        if (error && error.code !== 'PGRST116') throw error;
        user = data;
      } else {
        user = localDb.prepare("SELECT * FROM users WHERE email = ?").get(normalizedEmail) as any;
      }

      if (!user) {
        console.warn(`LOGIN FALHOU: Usuário não encontrado -> ${normalizedEmail}`);
        return res.status(401).json({ error: "Credenciais inválidas" });
      }

      const isPasswordCorrect = bcrypt.compareSync(password, user.password);
      if (!isPasswordCorrect) {
        console.warn(`LOGIN FALHOU: Senha incorreta para -> ${normalizedEmail}`);
        return res.status(401).json({ error: "Credenciais inválidas" });
      }

      const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: "7d" });
      res.cookie("token", token, {
        httpOnly: true,
        secure: true,
        sameSite: "none",
        maxAge: 7 * 24 * 60 * 60 * 1000,
      });

      console.log(`Login bem-sucedido: ${email}`);
      res.json({ 
        token,
        user: { id: user.id, email: user.email, name: user.name, analysis_count: user.analysis_count, plan: user.plan, plan_expires_at: user.plan_expires_at } 
      });
    } catch (err: any) {
      console.error("Erro no processo de login:", err);
      res.status(500).json({ error: "Erro interno no servidor de autenticação" });
    }
  });

  app.post(["/api/auth/logout", "/api/auth/logout/"], (req, res) => {
    res.clearCookie("token", {
      httpOnly: true,
      secure: true,
      sameSite: "none",
    });
    res.json({ message: "Logout realizado" });
  });

  app.get(["/api/auth/me", "/api/auth/me/"], async (req, res) => {
    const token = req.cookies.token || req.headers.authorization?.split(" ")[1];
    if (!token) return res.status(401).json({ error: "Não autenticado" });

    try {
      const decoded = jwt.verify(token, JWT_SECRET) as any;
      let user: any;

      if (isSupabase && supabase) {
        const { data, error } = await supabase.from('users').select('id, email, name, analysis_count, plan, plan_expires_at').eq('id', decoded.id).single();
        if (error) throw error;
        user = data;
      } else {
        user = localDb.prepare("SELECT id, email, name, analysis_count, plan, plan_expires_at FROM users WHERE id = ?").get(decoded.id) as any;
      }

      if (!user) return res.status(401).json({ error: "Usuário não encontrado" });
      res.json({ user });
    } catch (err) {
      res.status(401).json({ error: "Token inválido" });
    }
  });

  app.get(["/api/analysis/check", "/api/analysis/check/"], async (req, res) => {
    const token = req.cookies.token || req.headers.authorization?.split(" ")[1];
    if (!token) return res.status(401).json({ error: "Não autenticado" });

    try {
      const decoded = jwt.verify(token, JWT_SECRET) as any;
      let user: any;

      if (isSupabase && supabase) {
        const { data, error } = await supabase.from('users').select('id, email, analysis_count, plan, plan_expires_at').eq('id', decoded.id).single();
        if (error) throw error;
        user = data;
      } else {
        user = localDb.prepare("SELECT id, email, analysis_count, plan, plan_expires_at FROM users WHERE id = ?").get(decoded.id) as any;
      }
      
      if (!user) return res.status(401).json({ error: "Usuário não encontrado" });

      const now = new Date();
      const isSubscribed = user.plan === 'pro' || user.email === 'admin@rico.com' || (user.plan !== 'free' && user.plan_expires_at && new Date(user.plan_expires_at) > now);

      if (!isSubscribed && user.analysis_count >= 2) {
        return res.status(403).json({ 
          canAnalyze: false, 
          error: "Limite de análises gratuitas atingido. Adquira um plano para continuar." 
        });
      }

      res.json({ canAnalyze: true, analysis_count: user.analysis_count });
    } catch (err) {
      res.status(401).json({ error: "Token inválido" });
    }
  });

  app.post(["/api/analysis/increment", "/api/analysis/increment/"], async (req, res) => {
    const token = req.cookies.token || req.headers.authorization?.split(" ")[1];
    const { trend, confidence, entryM1, entryM5, rationale } = req.body;
    if (!token) return res.status(401).json({ error: "Não autenticado" });

    try {
      const decoded = jwt.verify(token, JWT_SECRET) as any;
      let user: any;

      if (isSupabase && supabase) {
        const { data, error } = await supabase.from('users').select('id, email, analysis_count, plan, plan_expires_at').eq('id', decoded.id).single();
        if (error) throw error;
        user = data;
      } else {
        user = localDb.prepare("SELECT id, email, analysis_count, plan, plan_expires_at FROM users WHERE id = ?").get(decoded.id) as any;
      }
      
      if (!user) return res.status(401).json({ error: "Usuário não encontrado" });

      const now = new Date();
      const isSubscribed = user.plan === 'pro' || user.email === 'admin@rico.com' || (user.plan !== 'free' && user.plan_expires_at && new Date(user.plan_expires_at) > now);

      if (!isSubscribed && user.analysis_count >= 2) {
        return res.status(403).json({ error: "Limite de análises gratuitas atingido. Adquira um plano para continuar." });
      }

      if (isSupabase && supabase) {
        const { error: updateError } = await supabase.from('users').update({ analysis_count: user.analysis_count + 1 }).eq('id', user.id);
        if (updateError) throw updateError;

        if (trend && confidence !== undefined && entryM1 && entryM5) {
          const { error: insertError } = await supabase.from('analyses').insert([{
            user_id: user.id,
            trend,
            confidence,
            entry_m1: entryM1,
            entry_m5: entryM5,
            rationale: rationale || null
          }]);
          if (insertError) throw insertError;
        }
      } else {
        // Start local transaction
        const transaction = localDb.transaction(() => {
          localDb.prepare("UPDATE users SET analysis_count = analysis_count + 1 WHERE id = ?").run(user.id);
          
          if (trend && confidence !== undefined && entryM1 && entryM5) {
            localDb.prepare(`
              INSERT INTO analyses (user_id, trend, confidence, entry_m1, entry_m5, rationale)
              VALUES (?, ?, ?, ?, ?, ?)
            `).run(user.id, trend, confidence, entryM1, entryM5, rationale || null);
          }
        });
        transaction();
      }

      // Broadcast new signal to all connected clients
      if (trend && confidence !== undefined) {
        io.emit("new_signal", {
          trend,
          confidence,
          entryM1,
          entryM5,
          userName: (user.name || "Usuário").split(' ')[0], // Only first name for privacy
          timestamp: new Date().toISOString()
        });
      }

      console.log(`Análise confirmada e creditada para: ${user.id} (${user.analysis_count + 1})`);
      res.json({ success: true, analysis_count: user.analysis_count + 1 });
    } catch (err: any) {
      console.error("Erro ao incrementar análise:", err);
      if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
        return res.status(401).json({ error: "Sessão expirada. Por favor, faça login novamente." });
      }
      res.status(500).json({ error: "Erro interno ao processar análise" });
    }
  });

  app.get(["/api/analysis/history", "/api/analysis/history/"], async (req, res) => {
    console.log(`[API] Buscando histórico para usuário...`);
    const token = req.cookies.token || req.headers.authorization?.split(" ")[1];
    if (!token) return res.status(401).json({ error: "Não autenticado" });

    try {
      const decoded = jwt.verify(token, JWT_SECRET) as any;
      let history: any[] = [];

      try {
        if (isSupabase && supabase) {
          const { data, error } = await supabase.from('analyses')
            .select('trend, confidence, entry_m1, entry_m5, rationale, created_at')
            .eq('user_id', decoded.id)
            .order('created_at', { ascending: false })
            .limit(10);
          if (error) throw error;
          history = data || [];
        } else {
          history = localDb.prepare(`
            SELECT trend, confidence, entry_m1, entry_m5, rationale, created_at 
            FROM analyses 
            WHERE user_id = ? 
            ORDER BY created_at DESC 
            LIMIT 10
          `).all(decoded.id) as any[];
        }
        res.json({ history });
      } catch (dbErr: any) {
        console.error("Erro ao acessar banco de dados (Histórico):", dbErr);
        // Fallback to empty history instead of failing if it's just a missing table
        res.json({ history: [], warning: "Erro ao acessar banco de dados" });
      }
    } catch (err) {
      res.status(401).json({ error: "Token inválido" });
    }
  });

  app.post(["/api/subscription/upgrade", "/api/subscription/upgrade/"], async (req, res) => {
    const token = req.cookies.token || req.headers.authorization?.split(" ")[1];
    const { planType } = req.body; // 'weekly' or 'monthly'
    if (!token) return res.status(401).json({ error: "Não autenticado" });

    try {
      const decoded = jwt.verify(token, JWT_SECRET) as any;
      const expiresAt = new Date();
      if (planType === 'weekly') {
        expiresAt.setDate(expiresAt.getDate() + 7);
      } else if (planType === 'monthly') {
        expiresAt.setMonth(expiresAt.getMonth() + 1);
      } else {
        return res.status(400).json({ error: "Plano inválido" });
      }

      if (isSupabase && supabase) {
        const { error } = await supabase.from('users').update({
          plan: planType,
          plan_expires_at: expiresAt.toISOString()
        }).eq('id', decoded.id);
        if (error) throw error;
      } else {
        localDb.prepare("UPDATE users SET plan = ?, plan_expires_at = ? WHERE id = ?").run(planType, expiresAt.toISOString(), decoded.id);
      }

      res.json({ success: true, plan: planType, expiresAt: expiresAt.toISOString() });
    } catch (err) {
      res.status(401).json({ error: "Token inválido" });
    }
  });

  app.post(["/api/checkout/create-preference", "/api/checkout/create-preference/"], async (req, res) => {
    const token = req.cookies.token || req.headers.authorization?.split(" ")[1];
    const { planType } = req.body;
    if (!token) return res.status(401).json({ error: "Não autenticado" });

    try {
      const decoded = jwt.verify(token, JWT_SECRET) as any;
      let user: any;

      if (isSupabase && supabase) {
        const { data, error } = await supabase.from('users').select('email').eq('id', decoded.id).single();
        if (error) throw error;
        user = data;
      } else {
        user = localDb.prepare("SELECT email FROM users WHERE id = ?").get(decoded.id) as any;
      }

      const title = planType === 'weekly' ? 'Plano Semanal R.I.C.O.' : 'Plano Mensal R.I.C.O.';
      const price = planType === 'weekly' ? 29.90 : 49.90;

      // Use the injected APP_URL or the specific dev URL as fallback
      const baseUrl = process.env.APP_URL || process.env.URL_DO_APLICATIVO || 'https://ais-dev-25hg36hwegd66vcpghsyjl-171134524183.us-east1.run.app';
      
      const preference = new Preference(mpClient);
      console.log(`Creating preference for ${planType} - User: ${user.email} - BaseURL: ${baseUrl}`);
      const result = await preference.create({
        body: {
          items: [
            {
              id: planType,
              title: title,
              quantity: 1,
              unit_price: price,
              currency_id: 'BRL'
            }
          ],
          payer: {
            email: user.email
          },
          back_urls: {
            success: `${baseUrl}/?payment=success&plan=${planType}`,
            failure: `${baseUrl}/?payment=failure`,
            pending: `${baseUrl}/?payment=pending`
          },
          auto_return: 'approved',
        }
      });

      console.log(`Preference created successfully: ${result.id}`);
      res.json({ id: result.id, init_point: result.init_point });
    } catch (err: any) {
      console.error('Mercado Pago Error:', err);
      res.status(500).json({ error: "Erro ao criar preferência de pagamento", details: err.message });
    }
  });

  app.post(["/api/auth/recover", "/api/auth/recover/"], async (req, res) => {
    const { email } = req.body;
    const normalizedEmail = email.toLowerCase().trim();
    let user: any;

    if (isSupabase && supabase) {
      const { data, error } = await supabase.from('users').select('*').eq('email', normalizedEmail).single();
      if (error && error.code !== 'PGRST116') throw error;
      user = data;
    } else {
      user = localDb.prepare("SELECT * FROM users WHERE email = ?").get(normalizedEmail) as any;
    }
    
    if (user) {
      // Since we don't have an email server in this demo environment,
      // we will just reset the password to '123456' and inform the user.
      const newPass = "123456";
      const hashed = bcrypt.hashSync(newPass, 10);

      if (isSupabase && supabase) {
        await supabase.from('users').update({ password: hashed }).eq('id', user.id);
      } else {
        localDb.prepare("UPDATE users SET password = ? WHERE id = ?").run(hashed, user.id);
      }

      console.log(`Senha redefinida para 123456 para: ${normalizedEmail}`);
      return res.json({ message: "Senha redefinida com sucesso para: 123456. Por favor, faça login." });
    }
    
    res.json({ message: "Se o email existir em nossa base, você receberá instruções." });
  });

  // Catch-all for non-matched /api routes to prevent HTML fallback
  app.all("/api/*", (req, res) => {
    res.status(404).json({ error: `Rota API não encontrada: ${req.method} ${req.url}` });
  });

  // Global error handler
  app.use((err: any, req: any, res: any, next: any) => {
    console.error("Erro não tratado:", err);
    res.status(500).json({ error: "Erro interno no servidor" });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }

  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer().catch(err => {
  console.error("Falha crítica ao iniciar o servidor:", err);
  process.exit(1);
});
