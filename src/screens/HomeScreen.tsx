import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  ScrollView,
  TouchableOpacity,
  Animated,
  PanResponder,
  Dimensions,
  Keyboard,
  TouchableWithoutFeedback,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
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
  const navigation = useNavigation<any>();
  // useCactusLM will manage state for us (tip #3 from hackathon)
  const cactusLM = useCactusLM({
    // small model for speed while prototyping (tip #2)
    model: 'qwen3-0.6',
  });

  const [userInput, setUserInput] = useState(
    "Using my health data from Fitness app, make me a calorie deficit plan to lose 1 kg per month."
  );
  const [answer, setAnswer] = useState('');
  const [memories, setMemories] = useState<Memory[]>([]);

  const screenHeight = Dimensions.get('window').height;
  const sheetMinHeight = 140;
  const sheetMaxHeight = screenHeight - 140;

  const sheetHeight = useRef(new Animated.Value(sheetMinHeight)).current;

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gestureState) =>
        Math.abs(gestureState.dy) > 10,
      onPanResponderMove: (_, gestureState) => {
        const nextHeight = sheetMinHeight - gestureState.dy;
        if (nextHeight >= sheetMinHeight && nextHeight <= sheetMaxHeight) {
          sheetHeight.setValue(nextHeight);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        const nextHeight = sheetMinHeight - gestureState.dy;
        const mid = (sheetMinHeight + sheetMaxHeight) / 2;
        const finalHeight = nextHeight > mid ? sheetMaxHeight : sheetMinHeight;
        Animated.spring(sheetHeight, {
          toValue: finalHeight,
          useNativeDriver: false,
        }).start();
      },
    })
  ).current;

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
          content: userInput || "Using my health data from Fitness app, make me a calorie deficit plan to lose 1 kg per month. It should show a message saying 'Your plan is ready' and keep taking photos of the food I eat.",
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
    <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
      <View style={styles.container}>
        <View style={styles.mainContent}>
          <Text style={styles.title}>TrackMyFood 🥗</Text>
          <Text style={styles.subtitle}>
            Local, private diet & fitness coach powered by Cactus.
          </Text>

          {cactusLM.isDownloading && (
            <Text style={styles.status}>
              Downloading model ({cactusLM.model}):{' '}
              {Math.round(cactusLM.downloadProgress * 100)}%
            </Text>
          )}

          {!cactusLM.isDownloading && !cactusLM.isDownloaded && (
            <Text style={styles.status}>
              Preparing model... it will download on first use.
            </Text>
          )}

          <View style={styles.inputRow}>
            <TextInput
              style={styles.input}
              value={userInput}
              onChangeText={setUserInput}
              placeholder="🎯 Tell TrackMyFood your goal..."
              multiline
            />
            <TouchableOpacity
              style={styles.iconButton}
              onPress={() => {
                // Placeholder for future voice input
              }}
            >
              <Text style={styles.iconText}>🎙️</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.primaryButtonsRow}>
            <TouchableOpacity
              style={
                cactusLM.isDownloaded
                  ? styles.primaryButton
                  : styles.primaryButtonDisabled
              }
              onPress={handleAsk}
              disabled={!cactusLM.isDownloaded}
            >
              <Text style={styles.primaryButtonText}>
                ✨ Generate My Plan
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={
                cactusLM.isDownloaded
                  ? styles.secondaryButton
                  : styles.secondaryButtonDisabled
              }
              onPress={handleAskFromMemories}
              disabled={!cactusLM.isDownloaded}
            >
              <Text style={styles.secondaryButtonText}>
                🧾 Ask Using My Food Log
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.navRow}>
            <TouchableOpacity
              style={styles.navButton}
              onPress={() => navigation.navigate('VisionNotes')}
            >
              <Text style={styles.navButtonText}>📸 Log Today&apos;s Meals</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.navButton}
              onPress={() => navigation.navigate('VoiceNotes')}
            >
              <Text style={styles.navButtonText}>🎤 Voice Notes</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={styles.saveButton} onPress={handleSaveMemory}>
            <Text style={styles.saveButtonText}>💾 Save This as Note</Text>
          </TouchableOpacity>

          <View style={styles.answerBox}>
            <View style={styles.answerHeaderRow}>
              <Text style={styles.answerLabel}>Assistant</Text>
              <TouchableOpacity
                style={styles.iconButtonSmall}
                onPress={() => {
                  // Placeholder for future TTS playback
                }}
              >
                <Text style={styles.iconText}>🔊</Text>
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.answerScroll}>
              <Text style={styles.answerText}>
                {answer ||
                  'Your plan is not generated yet. Tell TrackMyFood your goal above.'}
              </Text>
            </ScrollView>
          </View>
        </View>

        <Animated.View
          style={[styles.bottomSheet, { height: sheetHeight }]}
          {...panResponder.panHandlers}
        >
          <View style={styles.sheetHandleContainer}>
            <View style={styles.sheetHandle} />
          </View>
          <TouchableOpacity
            style={[styles.navButton, { marginTop: 8 }]}
            onPress={() => navigation.navigate('Summary')}
          >
            <Text style={styles.navButtonText}>📊 Daily Summary &amp; Trends</Text>
          </TouchableOpacity>
          <Text style={styles.timelineTitle}>Today&apos;s memories</Text>
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
        </Animated.View>
      </View>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0b0c10',
  },
  mainContent: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 48,
    paddingBottom: 8,
  },
  title: {
    fontSize: 30,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 6,
    color: '#ffffff',
  },
  subtitle: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 20,
    color: '#b0b0b0',
  },
  status: {
    fontSize: 12,
    textAlign: 'center',
    marginBottom: 12,
    color: '#aaaaaa',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#333',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 12,
    backgroundColor: '#111318',
    color: '#ffffff',
    fontSize: 14,
    minHeight: 60,
    textAlignVertical: 'top',
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#1f2933',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  iconButtonSmall: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#1f2933',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconText: {
    fontSize: 18,
    color: '#ffffff',
  },
  primaryButtonsRow: {
    marginTop: 8,
    marginBottom: 12,
    gap: 8,
  },
  primaryButton: {
    backgroundColor: '#22c55e',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 16,
    alignItems: 'center',
  },
  primaryButtonDisabled: {
    backgroundColor: '#14532d',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 16,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#0b0c10',
    fontWeight: '700',
    fontSize: 15,
  },
  secondaryButton: {
    backgroundColor: '#111827',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 16,
    alignItems: 'center',
  },
  secondaryButtonDisabled: {
    backgroundColor: '#020617',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 16,
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: '#e5e7eb',
    fontWeight: '600',
    fontSize: 14,
  },
  navRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 8,
  },
  navButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 16,
    backgroundColor: '#111827',
    alignItems: 'center',
    justifyContent: 'center',
  },
  navButtonText: {
    fontSize: 14,
    color: '#e5e7eb',
    fontWeight: '600',
  },
  saveButton: {
    marginTop: 4,
    marginBottom: 8,
    alignSelf: 'center',
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#374151',
    backgroundColor: '#020617',
  },
  saveButtonText: {
    fontSize: 13,
    color: '#e5e7eb',
    fontWeight: '500',
  },
  answerBox: {
    marginTop: 8,
    borderRadius: 16,
    backgroundColor: '#020617',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#1f2933',
    maxHeight: 200,
  },
  answerHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  answerLabel: {
    fontWeight: '600',
    color: '#e5e7eb',
    fontSize: 14,
  },
  answerScroll: {
    maxHeight: 160,
  },
  answerText: {
    fontSize: 14,
    color: '#d1d5db',
  },
  timelineTitle: {
    marginTop: 4,
    fontSize: 15,
    fontWeight: '600',
    color: '#e5e7eb',
    marginBottom: 4,
  },
  timeline: {
    marginTop: 4,
    flex: 1,
  },
  empty: {
    fontSize: 12,
    color: '#9ca3af',
  },
  memoryCard: {
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderColor: '#1f2933',
  },
  memoryTime: {
    fontSize: 11,
    color: '#6b7280',
    marginBottom: 2,
  },
  memorySummary: {
    fontSize: 14,
    fontWeight: '600',
    color: '#e5e7eb',
  },
  memoryRaw: {
    fontSize: 12,
    color: '#9ca3af',
  },
  bottomSheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#020617',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 16,
    borderTopWidth: 1,
    borderColor: '#1f2933',
  },
  sheetHandleContainer: {
    alignItems: 'center',
    marginBottom: 4,
  },
  sheetHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#4b5563',
  },
});