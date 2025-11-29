import React, { useEffect, useState } from 'react';
import { View, Text, Button, StyleSheet, TextInput, ScrollView, TouchableOpacity } from 'react-native';
import { useCactusLM } from 'cactus-react-native';
import { initDb, insertMemory, getRecentMemories, getAllMemories, type Memory } from '../db/memoryDb';

function cosineSim(a: number[], b: number[]): number {
  if (a.length === 0 || b.length === 0 || a.length !== b.length) return 0;
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

export default function HomeScreen() {
  // useCactusLM will manage state for us (tip #3 from hackathon)
  const cactusLM = useCactusLM({
    // small model for speed while prototyping (tip #2)
    model: 'qwen3-0.6',
  });

  const [userInput, setUserInput] = useState('What is TrackMyBrain?');
  const [answer, setAnswer] = useState('');
  const [memories, setMemories] = useState<Memory[]>([]);

  useEffect(() => {
    initDb();
    refreshMemories();
  }, []);

  // Download model once (offline-first: tip #4)
  useEffect(() => {
    if (!cactusLM.isDownloaded && !cactusLM.isDownloading) {
      cactusLM.download();
    }
  }, [cactusLM.isDownloaded, cactusLM.isDownloading, cactusLM]);

  const refreshMemories = async () => {
    try {
      const rows = await getRecentMemories(30);
      setMemories(rows);
    } catch (e) {
      console.warn('Failed to load memories', e);
    }
  };

  // Whenever hook updates completion text, mirror it into local state
  useEffect(() => {
    if (cactusLM.completion) {
      const cleaned = cactusLM.completion
        .replace(/<think>[\s\S]*?<\/think>/i, '')
        .trim();

      setAnswer(cleaned || cactusLM.completion);
    }
  }, [cactusLM.completion]);

  const handleAsk = () => {
    if (!cactusLM.isDownloaded) {
      return;
    }

    cactusLM.complete({
      messages: [
        {
          role: 'user',
          content: userInput || 'What is TrackMyBrain?',
        },
      ],
    });
  };

  const handleSaveMemory = async () => {
    const rawText = userInput.trim();
    const summary = (answer || userInput).trim();
    if (!rawText && !summary) {
      return;
    }
    const now = Date.now();
    const id = String(now);

    let embedding: number[] | undefined = undefined;

    try {
      if (cactusLM.isDownloaded) {
        const embResult: any = await cactusLM.embed({
          text: rawText || summary,
        });
        // Handle possible shapes of the embed response
        embedding = embResult?.embedding || embResult?.embeddings?.[0]?.embedding;
      }
    } catch (e) {
      console.warn('Failed to compute embedding for memory', e);
    }

    try {
      await insertMemory({
        id,
        type: 'text',
        rawText,
        summary,
        createdAt: now,
        embedding,
      });
      await refreshMemories();
    } catch (e) {
      console.warn('Failed to save memory', e);
    }
  };

  const handleAskFromMemories = async () => {
    const question = userInput.trim();
    if (!question) return;
    if (!cactusLM.isDownloaded) return;

    try {
      // 1) Embed the question
      const qEmbResult: any = await cactusLM.embed({ text: question });
      const queryEmbedding: number[] =
        qEmbResult?.embedding || qEmbResult?.embeddings?.[0]?.embedding || [];

      if (!queryEmbedding.length) {
        console.warn('No embedding produced for query');
        return;
      }

      // 2) Load memories with embeddings
      const all = await getAllMemories();
      const withEmb = all.filter(m => m.embedding && m.embedding.length > 0);

      if (withEmb.length === 0) {
        // fallback: just answer without memories
        handleAsk();
        return;
      }

      // 3) Compute similarity
      const scored = withEmb
        .map(m => ({
          memory: m,
          score: cosineSim(queryEmbedding, m.embedding as number[]),
        }))
        .sort((a, b) => b.score - a.score);

      const topK = scored.slice(0, 5).map(x => x.memory);

      const context = topK
        .map(
          (m, i) =>
            `${i + 1}. [${m.type}] ${new Date(m.createdAt).toLocaleString()} – ${
              m.summary
            }\n${m.rawText}`,
        )
        .join('\n\n');

      const systemPrompt = `
You are TrackMyBrain, my personal memory assistant.
Use ONLY the memories below to answer the user's question.
If something isn't covered by the memories, say you don't know.

Memories:
${context}
      `.trim();

      cactusLM.complete({
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: question },
        ],
      });
    } catch (e) {
      console.warn('Error in AskFromMemories', e);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>TrackMyBrain 🧠</Text>
      <Text style={styles.subtitle}>Local, private memory assistant using Cactus.</Text>

      {cactusLM.isDownloading && (
        <Text style={styles.status}>
          Downloading model ({cactusLM.model}):{' '}
          {Math.round(cactusLM.downloadProgress * 100)}%
        </Text>
      )}

      {!cactusLM.isDownloading && !cactusLM.isDownloaded && (
        <Text style={styles.status}>
          Preparing model... tap "Download" in dev tools if needed.
        </Text>
      )}

      <TextInput
        style={styles.input}
        value={userInput}
        onChangeText={setUserInput}
        placeholder="Ask TrackMyBrain anything..."
      />

      <Button
        title={
          cactusLM.isDownloaded
            ? 'Ask TrackMyBrain'
            : 'Model downloading...'
        }
        onPress={handleAsk}
        disabled={!cactusLM.isDownloaded}
      />

      <View style={{ height: 8 }} />

      <Button
        title="Ask from Memories"
        onPress={handleAskFromMemories}
        disabled={!cactusLM.isDownloaded}
      />

      <TouchableOpacity style={styles.saveButton} onPress={handleSaveMemory}>
        <Text style={styles.saveButtonText}>Save as Memory</Text>
      </TouchableOpacity>

      <ScrollView style={styles.answerBox}>
        <Text style={styles.answerLabel}>Answer:</Text>
        <Text style={styles.answerText}>{answer || 'No answer yet.'}</Text>
      </ScrollView>

      <Text style={styles.timelineTitle}>Recent Memories</Text>
      <ScrollView style={styles.timeline}>
        {memories.length === 0 ? (
          <Text style={styles.empty}>No memories yet. Save one above.</Text>
        ) : (
          memories.map(m => (
            <View key={m.id} style={styles.memoryCard}>
              <Text style={styles.memoryTime}>
                {new Date(m.createdAt).toLocaleTimeString()}
              </Text>
              <Text style={styles.memorySummary}>{m.summary}</Text>
              <Text style={styles.memoryRaw} numberOfLines={2}>
                {m.rawText}
              </Text>
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, paddingTop: 48 },
  title: { fontSize: 28, fontWeight: '700', textAlign: 'center', marginBottom: 8 },
  subtitle: { fontSize: 14, textAlign: 'center', marginBottom: 24, opacity: 0.8 },
  status: { fontSize: 12, textAlign: 'center', marginBottom: 12, opacity: 0.7 },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
    marginBottom: 12,
  },
  answerBox: {
    marginTop: 16,
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
  },
  answerLabel: { fontWeight: '600', marginBottom: 4 },
  answerText: { fontSize: 14 },
  saveButton: {
    marginTop: 8,
    marginBottom: 8,
    alignSelf: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 1,
  },
  saveButtonText: { fontSize: 14 },
  timelineTitle: { marginTop: 16, fontSize: 16, fontWeight: '600' },
  timeline: { marginTop: 8, flex: 1 },
  empty: { fontSize: 12, opacity: 0.6 },
  memoryCard: {
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderColor: '#eee',
  },
  memoryTime: { fontSize: 11, opacity: 0.6, marginBottom: 2 },
  memorySummary: { fontSize: 14, fontWeight: '600' },
  memoryRaw: { fontSize: 12, opacity: 0.8 },
});