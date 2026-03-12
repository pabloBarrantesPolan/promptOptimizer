import fs from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";
import { hashPassword } from "./auth.js";

const DATA_DIR = process.env.DATA_DIR || path.join(process.cwd(), "data");
const USERS_FILE = path.join(DATA_DIR, "users.json");

async function ensureUsersFile() {
  await fs.mkdir(DATA_DIR, { recursive: true });
  try {
    await fs.access(USERS_FILE);
  } catch {
    await fs.writeFile(USERS_FILE, "[]", "utf8");
  }
}

export async function readUsers() {
  await ensureUsersFile();
  const raw = await fs.readFile(USERS_FILE, "utf8");
  try {
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

async function writeUsers(users) {
  await ensureUsersFile();
  await fs.writeFile(USERS_FILE, JSON.stringify(users, null, 2), "utf8");
}

export async function findUserByEmail(email) {
  const users = await readUsers();
  return users.find((u) => u.email.toLowerCase() === email.toLowerCase());
}

export async function findUserById(id) {
  const users = await readUsers();
  return users.find((u) => u.id === id);
}

export async function createUser({ email, password, role = "user" }) {
  const users = await readUsers();
  if (users.some((u) => u.email.toLowerCase() === email.toLowerCase())) {
    throw new Error("E-mail já cadastrado.");
  }
  const passwordHash = await hashPassword(password);
  const user = {
    id: randomUUID(),
    email: email.toLowerCase(),
    passwordHash,
    role,
    authorizedAt: role === "admin" ? new Date().toISOString() : null,
    createdAt: new Date().toISOString(),
  };
  users.push(user);
  await writeUsers(users);
  return user;
}

export async function authorizeUser(userId, adminId) {
  const users = await readUsers();
  const idx = users.findIndex((u) => u.id === userId);
  if (idx === -1) throw new Error("Usuário não encontrado.");
  users[idx].authorizedAt = new Date().toISOString();
  users[idx].authorizedBy = adminId;
  await writeUsers(users);
  return users[idx];
}

export async function ensureAdminExists() {
  const users = await readUsers();
  const hasAdmin = users.some((u) => u.role === "admin");
  if (!hasAdmin) {
    const adminEmail = process.env.ADMIN_EMAIL;
    const adminPassword = process.env.ADMIN_PASSWORD;
    if (!adminEmail || !adminPassword) {
      throw new Error(
        "ADMIN_EMAIL e ADMIN_PASSWORD devem ser definidos (env ou AWS Secrets Manager) para criar o admin inicial."
      );
    }
    await createUser({
      email: adminEmail,
      password: adminPassword,
      role: "admin",
    });
    console.log(`Admin criado: ${adminEmail}`);
  }
}
