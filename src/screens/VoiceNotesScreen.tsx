import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import Tts from 'react-native-tts';
import { useCactusSTT, useCactusLM, type CactusSTTTranscribeResult } from 'cactus-react-native';
import * as DocumentPicker from '@react-native-documents/picker';
import * as RNFS from '@dr.pogodin/react-native-fs';
import { insertMemory, getRecentMemories, type Memory } from '../db/memoryDb';

const VoiceNotesScreen = () => {
  const [audioPath, setAudioPath] = useState<string | null>(null);
  const [audioName, setAudioName] = useState<string>('');
  const [lastTranscript, setLastTranscript] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);

  const cactusSTT = useCactusSTT({ model: 'whisper-small' });
  const cactusLM = useCactusLM({ model: 'qwen3-0.6' });

  useEffect(() => {
    if (!cactusSTT.isDownloaded) {
      cactusSTT.download();
    }
  }, [cactusSTT.isDownloaded]);

  useEffect(() => {
    if (!cactusLM.isDownloaded && !cactusLM.isDownloading) {
      cactusLM.download();
    }
  }, [cactusLM.isDownloaded, cactusLM.isDownloading, cactusLM]);

  const handleSelectAudio = async () => {
    try {
      const res = await DocumentPicker.pick({
        type: [DocumentPicker.types.audio],
      });
      if (res && res.length > 0) {
        const fileName = `voice_${Date.now()}_${res[0].name ?? 'audio'}`;
        const destPath = `${RNFS.CachesDirectoryPath}/${fileName}`;
        await RNFS.copyFile(res[0].uri, destPath);
        setAudioPath(destPath);
        setAudioName(res[0].name || 'Selected audio');
      }
    } catch (err) {
      console.warn('Audio pick cancelled or failed', err);
    }
  };

  const handleTranscribeAndSave = async () => {
    if (!audioPath) {
      console.warn('No audio file selected');
      return;
    }
    try {
      if (!cactusSTT.isDownloaded) {
        console.warn('STT model not downloaded yet');
        return;
      }
      const sttResult: CactusSTTTranscribeResult = await cactusSTT.transcribe({
        audioFilePath: audioPath,
      });
      const transcript = (sttResult.response || '').trim();
      if (!transcript) {
        console.warn('Empty transcript from STT');
        return;
      }
      setLastTranscript(transcript);

      if (!cactusLM.isDownloaded) {
        console.warn('Text model not downloaded yet, cannot embed voice note');
        return;
      }

      setIsSaving(true);
      try {
        const embResult: any = await cactusLM.embed({ text: transcript });
        const embedding: number[] =
          embResult?.embedding || embResult?.embeddings?.[0]?.embedding || [];

        const now = Date.now();
        await insertMemory({
          id: String(now),
          type: 'voice',
          rawText: transcript,
          summary: transcript,
          createdAt: now,
          embedding,
          mediaUri: audioPath,
        });
      } finally {
        setIsSaving(false);
      }
    } catch (e) {
      console.warn('Error in handleTranscribeAndSave', e);
    }
  };

  const handleSpeakLastNote = async () => {
    try {
      setIsSpeaking(true);
      const recent: Memory[] = await getRecentMemories(10);
      const lastVoice = recent.find(m => m.type === 'voice');
      if (!lastVoice) {
        await Tts.speak('No voice notes found yet.');
      } else {
        await Tts.speak(lastVoice.summary || lastVoice.rawText || 'Empty note.');
      }
    } catch (e) {
      console.warn('Failed to speak last note', e);
    } finally {
      setIsSpeaking(false);
    }
  };

  if (cactusSTT.isDownloading || cactusLM.isDownloading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" />
        <Text style={styles.progressText}>
          Downloading models…
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Voice Notes 🎙</Text>
      <Text style={styles.subtitle}>
        Pick an audio file, transcribe it on-device with Whisper, and save it as a memory.
      </Text>

      <TouchableOpacity style={styles.micButton} onPress={handleSelectAudio}>
        <Text style={styles.micIcon}>{audioPath ? '✅' : '🎤'}</Text>
      </TouchableOpacity>

      {audioName ? (
        <Text style={styles.selectedFileText}>Selected: {audioName}</Text>
      ) : null}

      <TouchableOpacity
        style={[
          styles.transcribeButton,
          (!audioPath || cactusSTT.isGenerating) && styles.disabledButton,
        ]}
        onPress={handleTranscribeAndSave}
        disabled={!audioPath || cactusSTT.isGenerating}
      >
        <Text style={styles.transcribeButtonText}>
          {cactusSTT.isGenerating ? 'Transcribing…' : 'Transcribe & Save Memory'}
        </Text>
      </TouchableOpacity>

      {lastTranscript ? (
        <View style={styles.transcriptBox}>
          <Text style={styles.label}>Last transcript:</Text>
          <Text style={styles.transcriptText}>{lastTranscript}</Text>
        </View>
      ) : null}

      {isSaving && <Text style={styles.status}>Saving voice memory…</Text>}

      <TouchableOpacity
        style={styles.retrieveButton}
        onPress={handleSpeakLastNote}
        disabled={isSpeaking}
      >
        <Text style={styles.retrieveButtonText}>
          {isSpeaking ? 'Speaking…' : '🔊 Retrieve & Speak Last Voice Note'}
        </Text>
      </TouchableOpacity>
    </View>
  );
};

export default VoiceNotesScreen;

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, paddingTop: 48, backgroundColor: '#fff' },
  title: { fontSize: 24, fontWeight: '700', textAlign: 'center', marginBottom: 8 },
  subtitle: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 32,
    opacity: 0.8,
  },
  micButton: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: '#111',
    alignSelf: 'center',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  micIcon: {
    fontSize: 64,
    color: '#fff',
  },
  transcriptBox: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginHorizontal: 8,
    marginBottom: 16,
  },
  label: { fontWeight: '600', marginBottom: 4 },
  transcriptText: { fontSize: 14 },
  status: { textAlign: 'center', fontSize: 12, marginBottom: 12 },
  retrieveButton: {
    marginTop: 8,
    alignSelf: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: '#111',
  },
  retrieveButtonText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  progressText: {
    marginTop: 16,
    fontSize: 16,
    color: '#000',
  },
  selectedFileText: {
    textAlign: 'center',
    marginBottom: 12,
    fontSize: 14,
  },
  transcribeButton: {
    alignSelf: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: '#111',
    marginBottom: 12,
  },
  transcribeButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  disabledButton: {
    opacity: 0.5,
  },
});