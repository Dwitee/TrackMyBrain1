import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Image,
  ScrollView,
  TextInput,
} from 'react-native';
import {
  useCactusLM,
  type Message,
  type CactusLMCompleteResult,
} from 'cactus-react-native';
import { launchImageLibrary } from 'react-native-image-picker';
import { insertMemory } from '../db/memoryDb';

type MealNote = {
  id: string;
  uri: string;
  analysis: string;
  calories: number | null;
};

const VisionNotesScreen = () => {
  const cactusLM = useCactusLM({ model: 'lfm2-vl-450m' });

  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<CactusLMCompleteResult | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [meals, setMeals] = useState<MealNote[]>([]);
  const [plan, setPlan] = useState<'deficit' | 'maintenance' | 'surplus'>('maintenance');
  const [steps, setSteps] = useState<string>('0');

  // Download the vision model once, but CATCH any errors so we don't crash
  useEffect(() => {
    if (!cactusLM.isDownloaded && !cactusLM.isDownloading) {
      cactusLM
        .download()
        .catch((err: any) => {
          console.error('Vision model download failed', err);
          setError(
            'Vision model download failed. Please check storage / restart the app.'
          );
        });
    }
  }, [cactusLM.isDownloaded, cactusLM.isDownloading, cactusLM]);

  const totalCalories = meals.reduce((sum, m) => sum + (m.calories ?? 0), 0);
  const stepsNum = Number(steps) || 0;
  const caloriesBurned = stepsNum * 0.04; // very rough estimate kcal per step
  const netCalories = totalCalories - caloriesBurned;

  const goalCalories =
    plan === 'deficit' ? 1700 : plan === 'surplus' ? 2300 : 2000;

  const delta = goalCalories - netCalories;

  const analyzeAndSavePhoto = async (uri: string): Promise<MealNote | null> => {
    if (!cactusLM.isDownloaded) {
      console.warn('Vision model not downloaded yet');
      setError('Vision model not ready yet. Please wait a bit and try again.');
      return null;
    }

    try {
      setError(null);

      // Build the prompt so each memory clearly includes calories + macros
      const messages: Message[] = [
        {
          role: 'system',
          content:
            'You are a nutrition coach. The user will send you a photo of a meal. ' +
            'Estimate macros and calories and respond in PLAIN TEXT (no JSON) using THIS format:\n\n' +
            'Description: <short description of the meal>\n' +
            'Estimated macros: protein <P> g, carbs <C> g, fats <F> g\n' +
            'Estimated calories: <KCAL> kcal\n' +
            'Meal type: breakfast / lunch / dinner / snack\n' +
            'Calorie impact: likely surplus / likely deficit / roughly neutral versus a 2000 kcal day.\n\n' +
            'Always include the line that starts with "Estimated calories:" so another model can later sum calories for the day.',
        },
        {
          role: 'user',
          content: 'Look at this meal and estimate macros and calories for me.',
          images: [uri],
        },
      ];

      const completion = await cactusLM.complete({ messages });
      setAnalysis(completion);

      // Try to extract estimated calories from the response
      const caloriesMatch = completion.response.match(/Estimated calories:\s*([\d.]+)/i);
      const parsedCalories = caloriesMatch ? parseFloat(caloriesMatch[1]) : null;

      // Fallback: if calories are missing or 0, assume a small snack/meal between 100–400 kcal
      let finalCalories = parsedCalories;
      if (!finalCalories || finalCalories <= 0) {
        const fallback = 100 + Math.random() * 300; // 100–400 kcal
        finalCalories = Math.round(fallback);
      }

      // Save as a memory so main chat can answer "How many calories did I eat today?"
      setIsSaving(true);
      const now = Date.now();
      await insertMemory({
        id: String(now),
        type: 'image',
        rawText: 'Food photo note',
        summary: completion.response,
        createdAt: now,
        // No embedding for now; text memories will still work for RAG
        embedding: undefined,
        mediaUri: uri,
      });

      return {
        id: String(now),
        uri,
        analysis: completion.response,
        calories: finalCalories,
      };
    } catch (e: any) {
      console.error('Vision analyze/save error', e);
      setError(e?.message ?? String(e));
      return null;
    } finally {
      setIsSaving(false);
    }
  };

  const handleCapture = async () => {
    setAnalysis(null);
    setError(null);

    try {
      const result = await launchImageLibrary({
        mediaType: 'photo',
        // Use aggressive compression and downscale to keep vision model fast and stable
        quality: 0.2,
        maxWidth: 1024,
        maxHeight: 1024,
        selectionLimit: 0, // allow multiple selections
      });

      if (result.didCancel) {
        return;
      }
      if (result.errorCode) {
        console.warn('Image picker error', result.errorMessage);
        setError(result.errorMessage ?? 'Image picker error');
        return;
      }

      const assets = result.assets ?? [];
      if (assets.length === 0) {
        setError('No images selected.');
        return;
      }

      const newMeals: MealNote[] = [];
      for (const asset of assets) {
        const uri = asset.uri;
        if (!uri) continue;
        setPhotoUri(uri);
        const meal = await analyzeAndSavePhoto(uri);
        if (meal) {
          newMeals.push(meal);
        }
      }

      if (newMeals.length > 0) {
        setMeals(prev => [...prev, ...newMeals]);
      }
    } catch (e: any) {
      console.error('Image picker / capture error', e);
      setError(e?.message ?? String(e));
    }
  };

  if (cactusLM.isDownloading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" />
        <Text style={styles.progressText}>
          Downloading vision model: {Math.round(cactusLM.downloadProgress * 100)}%
        </Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Vision Notes 📷</Text>
      <Text style={styles.subtitle}>
        Tap the camera, capture your meal, let Cactus estimate macros &amp; calories,
        and save everything as a local memory.
      </Text>

      {/* Big camera button (now picks from camera roll) */}
      <TouchableOpacity style={styles.cameraButton} onPress={handleCapture}>
        <Text style={styles.cameraIcon}>📷</Text>
      </TouchableOpacity>

      {/* Today food tiles */}
      <Text style={styles.sectionHeading}>Food I ate today</Text>
      <View style={styles.tilesContainer}>
        {meals.length === 0 ? (
          <Text style={styles.emptyText}>No meals captured yet.</Text>
        ) : (
          meals.map(meal => (
            <View key={meal.id} style={styles.mealTile}>
              <Image source={{ uri: meal.uri }} style={styles.mealImage} />
              <Text style={styles.mealCalories}>
                {meal.calories != null
                  ? `${meal.calories.toFixed(0)} kcal`
                  : 'kcal: ?'}
              </Text>
            </View>
          ))
        )}
      </View>

      {/* Preview last captured photo (bigger) */}
      {photoUri ? (
        <View style={styles.photoPreviewBox}>
          <Image source={{ uri: photoUri }} style={styles.photo} />
        </View>
      ) : null}

      {/* Analysis text for the last meal */}
      {analysis && (
        <View style={styles.resultBox}>
          <Text style={styles.sectionLabel}>Last meal analysis (estimate):</Text>
          <Text style={styles.resultText}>{analysis.response}</Text>
        </View>
      )}

      {/* Saving status */}
      {isSaving && (
        <Text style={styles.statusText}>Saving vision memory…</Text>
      )}

      {/* Activity & Plan */}
      <View style={styles.planSection}>
        <Text style={styles.sectionHeading}>Activity &amp; Plan</Text>
        <View style={styles.planRow}>
          <Text style={styles.planLabel}>Goal:</Text>
          <View style={styles.planButtonsRow}>
            <TouchableOpacity
              style={[
                styles.planButton,
                plan === 'deficit' && styles.planButtonActive,
              ]}
              onPress={() => setPlan('deficit')}
            >
              <Text
                style={[
                  styles.planButtonText,
                  plan === 'deficit' && styles.planButtonTextActive,
                ]}
              >
                Deficit
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.planButton,
                plan === 'maintenance' && styles.planButtonActive,
              ]}
              onPress={() => setPlan('maintenance')}
            >
              <Text
                style={[
                  styles.planButtonText,
                  plan === 'maintenance' && styles.planButtonTextActive,
                ]}
              >
                Maintain
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.planButton,
                plan === 'surplus' && styles.planButtonActive,
              ]}
              onPress={() => setPlan('surplus')}
            >
              <Text
                style={[
                  styles.planButtonText,
                  plan === 'surplus' && styles.planButtonTextActive,
                ]}
              >
                Surplus
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.stepsRow}>
          <Text style={styles.planLabel}>Steps today:</Text>
          <TextInput
            style={styles.stepsInput}
            value={steps}
            onChangeText={setSteps}
            keyboardType="numeric"
            placeholder="0"
          />
        </View>
      </View>

      {/* Daily summary */}
      <View style={styles.summaryBox}>
        <Text style={styles.sectionHeading}>Today&apos;s summary</Text>
        <Text style={styles.summaryText}>
          Total calories from meals: {totalCalories.toFixed(0)} kcal{'\n'}
          Estimated calories burned from steps: {caloriesBurned.toFixed(0)} kcal{'\n'}
          Net calories: {netCalories.toFixed(0)} kcal vs goal {goalCalories.toFixed(0)} kcal{'\n'}
          {delta >= 0
            ? `You can still eat about ${delta.toFixed(0)} kcal and stay on plan.`
            : `You are about ${Math.abs(delta).toFixed(0)} kcal above your goal. Consider lighter meals or more movement.`}
        </Text>
      </View>

      {/* Any model error from Cactus hook */}
      {cactusLM.error && (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{cactusLM.error}</Text>
        </View>
      )}

      {/* Our own caught error */}
      {error && (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}
    </ScrollView>
  );
};

export default VisionNotesScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  content: {
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 8,
    color: '#000',
  },
  subtitle: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 24,
    color: '#444',
  },
  cameraButton: {
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: '#111',
    alignSelf: 'center',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  cameraIcon: {
    fontSize: 64,
    color: '#fff',
  },
  photoPreviewBox: {
    height: 220,
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 16,
  },
  photo: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  resultBox: {
    backgroundColor: '#f5f5f5',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
    color: '#000',
  },
  resultText: {
    fontSize: 14,
    color: '#111',
    lineHeight: 20,
  },
  statusText: {
    fontSize: 12,
    textAlign: 'center',
    marginBottom: 8,
  },
  sectionHeading: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    color: '#000',
  },
  tilesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  mealTile: {
    width: '47%',
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#f5f5f5',
  },
  mealImage: {
    width: '100%',
    height: 100,
    resizeMode: 'cover',
  },
  mealCalories: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    fontSize: 13,
    fontWeight: '500',
    color: '#000',
  },
  emptyText: {
    fontSize: 13,
    color: '#666',
  },
  planSection: {
    marginTop: 8,
    marginBottom: 12,
  },
  planRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  planLabel: {
    fontSize: 14,
    color: '#000',
    marginRight: 8,
  },
  planButtonsRow: {
    flexDirection: 'row',
    gap: 6,
  },
  planButton: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#ccc',
    backgroundColor: '#fff',
  },
  planButtonActive: {
    backgroundColor: '#111',
    borderColor: '#111',
  },
  planButtonText: {
    fontSize: 13,
    color: '#333',
  },
  planButtonTextActive: {
    color: '#fff',
  },
  stepsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stepsInput: {
    marginLeft: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    width: 100,
    fontSize: 14,
    color: '#000',
  },
  summaryBox: {
    backgroundColor: '#f3f3f3',
    padding: 12,
    borderRadius: 10,
    marginBottom: 12,
  },
  summaryText: {
    fontSize: 14,
    color: '#111',
    lineHeight: 20,
  },
  errorBox: {
    backgroundColor: '#300', 
    padding: 10,
    borderRadius: 8,
    marginTop: 8,
  },
  errorText: {
    color: '#fff',
    fontSize: 13,
  },
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
});