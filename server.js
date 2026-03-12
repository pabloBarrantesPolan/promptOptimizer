import "dotenv/config";
import express from "express";
import fs from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";
import { queryAI, isAIConfigured } from "./services/ai.js";
import { verifyToken, verifyPassword, signToken } from "./services/auth.js";
import {
  readUsers,
  findUserByEmail,
  findUserById,
  createUser,
  authorizeUser,
  ensureAdminExists,
} from "./services/users.js";

const app = express();
const PORT = Number(
  process.env.PORT || (process.env.NODE_ENV === "production" ? 80 : 3001)
);
const DATA_DIR = process.env.DATA_DIR || path.join(process.cwd(), "data");
const DATA_FILE = path.join(DATA_DIR, "surveys.json");
const AUTH_ENABLED = process.env.AUTH_ENABLED !== "false";

app.use(express.json({ limit: "1mb" }));

const authMiddleware = (req, res, next) => {
  if (!AUTH_ENABLED) return next();
  const auth = req.headers.authorization;
  const token = auth?.startsWith("Bearer ") ? auth.slice(7) : null;
  const payload = token ? verifyToken(token) : null;
  if (!payload) {
    return res.status(401).json({ error: "Não autenticado." });
  }
  req.user = payload;
  next();
};

const adminMiddleware = (req, res, next) => {
  if (!AUTH_ENABLED) return next();
  if (req.user?.role !== "admin") {
    return res.status(403).json({ error: "Acesso negado." });
  }
  next();
};

const ensureDataFile = async () => {
  await fs.mkdir(DATA_DIR, { recursive: true });
  try {
    await fs.access(DATA_FILE);
  } catch (error) {
    await fs.writeFile(DATA_FILE, "[]", "utf8");
  }
};

const readSurveys = async () => {
  await ensureDataFile();
  const raw = await fs.readFile(DATA_FILE, "utf8");
  try {
    return JSON.parse(raw);
  } catch (error) {
    return [];
  }
};

const writeSurveys = async (surveys) => {
  await ensureDataFile();
  await fs.writeFile(DATA_FILE, JSON.stringify(surveys, null, 2), "utf8");
};

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.get("/api/ai/status", (_req, res) => {
  res.json({ configured: isAIConfigured() });
});

app.get("/api/auth/status", (_req, res) => {
  res.json({ enabled: AUTH_ENABLED });
});

app.post("/api/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: "E-mail e senha obrigatórios." });
    }
    const user = await findUserByEmail(email);
    if (!user) {
      return res.status(401).json({ error: "Credenciais inválidas." });
    }
    if (!user.authorizedAt && user.role !== "admin") {
      return res.status(403).json({
        error: "Conta aguardando autorização do administrador.",
      });
    }
    const valid = await verifyPassword(password, user.passwordHash);
    if (!valid) {
      return res.status(401).json({ error: "Credenciais inválidas." });
    }
    const token = signToken({
      id: user.id,
      email: user.email,
      role: user.role,
    });
    res.json({
      token,
      user: { id: user.id, email: user.email, role: user.role },
    });
  } catch (error) {
    console.error("Erro no login:", error);
    res.status(500).json({ error: "Falha no login." });
  }
});

app.post("/api/auth/register", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: "E-mail e senha obrigatórios." });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: "Senha deve ter no mínimo 6 caracteres." });
    }
    const user = await createUser({ email, password, role: "user" });
    res.status(201).json({
      message: "Cadastro realizado. Aguarde autorização do administrador.",
      user: { id: user.id, email: user.email, role: user.role },
    });
  } catch (error) {
    if (error.message?.includes("já cadastrado")) {
      return res.status(409).json({ error: error.message });
    }
    console.error("Erro no cadastro:", error);
    res.status(500).json({ error: "Falha no cadastro." });
  }
});

app.get("/api/users", authMiddleware, adminMiddleware, async (_req, res) => {
  try {
    const users = await readUsers();
    res.json(
      users.map((u) => ({
        id: u.id,
        email: u.email,
        role: u.role,
        authorizedAt: u.authorizedAt,
        createdAt: u.createdAt,
      }))
    );
  } catch (error) {
    res.status(500).json({ error: "Falha ao listar usuários." });
  }
});

app.post(
  "/api/users/:id/authorize",
  authMiddleware,
  adminMiddleware,
  async (req, res) => {
    try {
      const user = await authorizeUser(req.params.id, req.user.id);
      res.json({
        message: "Usuário autorizado.",
        user: { id: user.id, email: user.email, role: user.role },
      });
    } catch (error) {
      if (error.message?.includes("não encontrado")) {
        return res.status(404).json({ error: error.message });
      }
      res.status(500).json({ error: "Falha ao autorizar." });
    }
  }
);

app.post("/api/ai/query", authMiddleware, async (req, res) => {
  try {
    if (!isAIConfigured()) {
      return res.status(503).json({
        error: "Serviço de IA não configurado. Defina GEMINI_API_KEY.",
      });
    }
    const { prompt } = req.body;
    if (!prompt || typeof prompt !== "string") {
      return res.status(400).json({ error: "Campo 'prompt' obrigatório." });
    }
    const { text, sessionId } = await queryAI(prompt.trim());
    res.json({ text, sessionId });
  } catch (error) {
    console.error("Erro ao consultar IA:", error);
    res.status(500).json({
      error: error.message || "Falha ao obter resposta da IA.",
    });
  }
});

app.get("/api/surveys", authMiddleware, async (_req, res) => {
  try {
    const surveys = await readSurveys();
    const ordered = surveys.sort(
      (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
    );
    res.json(ordered);
  } catch (error) {
    res.status(500).json({ error: "Falha ao carregar formulários." });
  }
});

app.post("/api/surveys", authMiddleware, async (req, res) => {
  try {
    const {
      initialPrompt,
      optimizedPrompt,
      answers,
      ratings,
      aiResponseInitial,
      aiResponseOptimized,
      sessionIdInitial,
      sessionIdOptimized,
    } = req.body;
    if (!initialPrompt || !optimizedPrompt || !ratings) {
      return res
        .status(400)
        .json({ error: "Dados obrigatórios ausentes." });
    }
    const surveys = await readSurveys();
    const entry = {
      id: randomUUID(),
      createdAt: new Date().toISOString(),
      downloadedAt: null,
      initialPrompt,
      optimizedPrompt,
      answers: answers || {},
      ratings,
      aiResponseInitial: aiResponseInitial ?? null,
      aiResponseOptimized: aiResponseOptimized ?? null,
      sessionIdInitial: sessionIdInitial ?? null,
      sessionIdOptimized: sessionIdOptimized ?? null,
    };
    surveys.push(entry);
    await writeSurveys(surveys);
    res.status(201).json(entry);
  } catch (error) {
    res.status(500).json({ error: "Falha ao salvar formulário." });
  }
});

app.get("/api/surveys/:id/export", authMiddleware, async (req, res) => {
  try {
    const surveys = await readSurveys();
    const target = surveys.find((item) => item.id === req.params.id);
    if (!target) {
      return res.status(404).json({ error: "Formulário não encontrado." });
    }
    const downloadedAt = new Date().toISOString();
    const updated = surveys.map((item) =>
      item.id === target.id ? { ...item, downloadedAt } : item
    );
    await writeSurveys(updated);
    res.setHeader("Content-Type", "application/json");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=\"survey-${target.id}.json\"`
    );
    res.send(JSON.stringify({ ...target, downloadedAt }, null, 2));
  } catch (error) {
    res.status(500).json({ error: "Falha ao exportar formulário." });
  }
});

app.get("/api/surveys/:id/export/txt", authMiddleware, async (req, res) => {
  try {
    const surveys = await readSurveys();
    const target = surveys.find((item) => item.id === req.params.id);
    if (!target) {
      return res.status(404).json({ error: "Formulário não encontrado." });
    }
    const createdAtSP = new Date(target.createdAt).toLocaleString("pt-BR", {
      timeZone: "America/Sao_Paulo",
    });
    const lines = [
      `Formulário de Avaliação - ID: ${target.id}`,
      `Data: ${createdAtSP}`,
      "",
      "=== Prompt Inicial ===",
      target.initialPrompt,
      "",
      "=== Prompt Otimizado ===",
      target.optimizedPrompt,
      "",
      "=== Avaliações (Likert 1-5) ===",
      ...Object.entries(target.ratings || {}).map(
        ([k, v]) => `${k}: ${v}`
      ),
      "",
    ];
    if (target.aiResponseInitial) {
      lines.push("=== Resposta IA – Prompt Inicial ===", target.aiResponseInitial, "");
    }
    if (target.aiResponseOptimized) {
      lines.push("=== Resposta IA – Prompt Otimizado ===", target.aiResponseOptimized, "");
    }
    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=\"survey-${target.id}.txt\"`
    );
    res.send(lines.join("\n"));
  } catch (error) {
    res.status(500).json({ error: "Falha ao exportar formulário." });
  }
});

app.delete("/api/surveys/:id", authMiddleware, async (req, res) => {
  try {
    const surveys = await readSurveys();
    const filtered = surveys.filter((item) => item.id !== req.params.id);
    if (filtered.length === surveys.length) {
      return res.status(404).json({ error: "Formulário não encontrado." });
    }
    await writeSurveys(filtered);
    res.json({ status: "deleted" });
  } catch (error) {
    res.status(500).json({ error: "Falha ao excluir formulário." });
  }
});

app.use(express.static("dist"));

app.get("*", (_req, res) => {
  res.sendFile(path.resolve("dist", "index.html"));
});

ensureAdminExists().then(() => {
  app.listen(PORT, () => {
    console.log(`Servidor iniciado na porta ${PORT}`);
  });
}).catch((err) => {
  console.error("Erro ao inicializar:", err);
  process.exit(1);
});
