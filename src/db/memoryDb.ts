import AsyncStorage from '@react-native-async-storage/async-storage';

export type MemoryType = 'text' | 'image' | 'voice' | 'video';

export type Memory = {
  id: string;
  type: MemoryType;
  rawText: string;
  summary: string;
  createdAt: number; // unix ms
  embedding?: number[]; // optional embedding vector
};

const STORAGE_KEY = 'trackmybrain_memories_v1';

export function initDb() {
  // No-op for AsyncStorage, but we keep the function so the interface stays the same.
  return;
}

async function loadAllMemories(): Promise<Memory[]> {
  try {
    const json = await AsyncStorage.getItem(STORAGE_KEY);
    if (!json) {
      return [];
    }
    const parsed = JSON.parse(json);
    if (Array.isArray(parsed)) {
      return parsed as Memory[];
    }
    return [];
  } catch (e) {
    console.warn('Failed to load memories from storage', e);
    return [];
  }
}

async function saveAllMemories(memories: Memory[]): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(memories));
  } catch (e) {
    console.warn('Failed to save memories to storage', e);
  }
}

export async function insertMemory(m: {
  id: string;
  type: MemoryType;
  rawText: string;
  summary: string;
  createdAt: number;
  embedding?: number[];
  // kept for future compatibility, currently unused:
  tags?: string | null;
  imagePath?: string | null;
  audioPath?: string | null;
}): Promise<void> {
  const existing = await loadAllMemories();
  const newMemory: Memory = {
    id: m.id,
    type: m.type,
    rawText: m.rawText,
    summary: m.summary,
    createdAt: m.createdAt,
    embedding: m.embedding,
  };
  const updated: Memory[] = [newMemory, ...existing];
  await saveAllMemories(updated);
}

export async function getRecentMemories(limit = 20): Promise<Memory[]> {
  const all = await loadAllMemories();
  const sorted = all.sort((a, b) => b.createdAt - a.createdAt);
  return sorted.slice(0, limit);
}

export async function getAllMemories(): Promise<Memory[]> {
  const all = await loadAllMemories();
  return all.sort((a, b) => b.createdAt - a.createdAt);
}