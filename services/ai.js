/**
 * Serviço de IA Generativa - Google Gemini
 * Cada chamada usa nova sessão (sem histórico) para evitar contexto do prompt anterior.
 */
import { GoogleGenAI } from "@google/genai";
import { randomUUID } from "crypto";

const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
const model = process.env.GEMINI_MODEL || "gemini-2.5-flash";

let aiClient = null;

function getClient() {
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY ou GOOGLE_API_KEY não configurada.");
  }
  if (!aiClient) {
    aiClient = new GoogleGenAI({ apiKey });
  }
  return aiClient;
}

/**
 * Envia um prompt para a IA e retorna a resposta.
 * Cada chamada é independente (nova sessão, sem histórico).
 * @param {string} prompt - O prompt a ser enviado
 * @returns {Promise<{ text: string, sessionId: string }>}
 */
export async function queryAI(prompt) {
  const sessionId = randomUUID();
  const client = getClient();

  const response = await client.models.generateContent({
    model,
    contents: prompt,
  });

  const text = response?.text ?? "";
  return { text, sessionId };
}

export function isAIConfigured() {
  return Boolean(apiKey);
}
