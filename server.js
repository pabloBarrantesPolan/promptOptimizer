import express from "express";
import fs from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";

const app = express();
const PORT = Number(process.env.PORT || 80);
const DATA_DIR = process.env.DATA_DIR || "/data";
const DATA_FILE = path.join(DATA_DIR, "surveys.json");

app.use(express.json({ limit: "1mb" }));

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

app.get("/api/surveys", async (_req, res) => {
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

app.post("/api/surveys", async (req, res) => {
  try {
    const { initialPrompt, optimizedPrompt, answers, ratings } = req.body;
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
    };
    surveys.push(entry);
    await writeSurveys(surveys);
    res.status(201).json(entry);
  } catch (error) {
    res.status(500).json({ error: "Falha ao salvar formulário." });
  }
});

app.get("/api/surveys/:id/export", async (req, res) => {
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

app.delete("/api/surveys/:id", async (req, res) => {
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

app.listen(PORT, () => {
  console.log(`Servidor iniciado na porta ${PORT}`);
});
