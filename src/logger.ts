import { db } from "./firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import type { Role } from "./App";

export interface LogEntry {
  id: string;
  timestamp: string; // ISO string
  timeFormatted: string; // Ex: "14/10/2024, 22:30:15"
  actorName: string;
  actorEmail: string;
  actorRole: Role;
  category: "auth" | "user" | "property" | "room" | "reservation" | "database" | "security";
  action: string;
  description: string;
  details?: Record<string, any>;
}

// In-memory logs buffer (fallback and instant access)
let memoryLogs: LogEntry[] = [];
const STORAGE_KEY = "propertyhub_system_logs";

export function loadLocalLogs(): LogEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      memoryLogs = JSON.parse(raw);
    }
  } catch (e) {
    console.warn("Falha ao carregar logs locais:", e);
  }
  return memoryLogs;
}

export async function logActivity(entry: {
  actorName: string;
  actorEmail: string;
  actorRole: Role;
  category: LogEntry["category"];
  action: string;
  description: string;
  details?: Record<string, any>;
}): Promise<LogEntry> {
  const now = new Date();
  const timeFormatted = `${String(now.getDate()).padStart(2, "0")}/${String(
    now.getMonth() + 1
  ).padStart(2, "0")}/${now.getFullYear()} ${String(now.getHours()).padStart(
    2,
    "0"
  )}:${String(now.getMinutes()).padStart(2, "0")}:${String(
    now.getSeconds()
  ).padStart(2, "0")}`;

  const newLog: LogEntry = {
    id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    timestamp: now.toISOString(),
    timeFormatted,
    actorName: entry.actorName || "Sistema",
    actorEmail: entry.actorEmail || "sistema@local",
    actorRole: entry.actorRole || "dev",
    category: entry.category,
    action: entry.action,
    description: entry.description,
    details: entry.details,
  };

  // 1. Grava no buffer de memória e localStorage
  memoryLogs = [newLog, ...memoryLogs].slice(0, 300); // mantém últimos 300 logs locais
  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(memoryLogs));
    } catch (e) {}
  }

  // 2. Grava de forma assíncrona no Firestore (sem travar a interface)
  try {
    addDoc(collection(db, "logs"), {
      ...newLog,
      createdAtServer: serverTimestamp(),
    }).catch((err) => {
      console.warn("Nota Firestore Logs:", err.message);
    });
  } catch (e) {}

  return newLog;
}

export function clearLocalLogs(): void {
  memoryLogs = [];
  if (typeof window !== "undefined") {
    localStorage.removeItem(STORAGE_KEY);
  }
}
