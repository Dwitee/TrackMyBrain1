import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
} from 'react-native';

const SummaryScreen: React.FC = () => {
  // For now we use mocked values – later you can wire these from SQLite or a context.
  const totalIntake = 2100; // kcal
  const totalBurn = 1850;   // kcal
  const protein = 120;      // g
  const carbs = 190;        // g
  const fats = 70;          // g

  const net = totalIntake - totalBurn;

  const macroTotal = protein + carbs + fats || 1;
  const proteinPct = (protein / macroTotal) * 100;
  const carbPct = (carbs / macroTotal) * 100;
  const fatPct = (fats / macroTotal) * 100;

  // For bar graph widths (0–100%)
  const intakePct = Math.min(100, (totalIntake / 2500) * 100);
  const burnPct = Math.min(100, (totalBurn / 2500) * 100);

  const moodEmoji = useMemo(() => {
    if (net < -200) return '🔥';
    if (net < 100) return '😌';
    return '🍕';
  }, [net]);

  const moodLabel = useMemo(() => {
    if (net < -200) return 'Calorie deficit – great job!';
    if (net < 100) return 'On track – nicely balanced.';
    return 'Slight surplus – enjoy, but watch the snacks.';
  }, [net]);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Today&apos;s Summary 📊</Text>
      <Text style={styles.subtitle}>
        A quick glance at your calories, burn, and macros.
      </Text>

      {/* Calorie intake vs burn graph */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>Calories in vs out</Text>
          <Text style={styles.cardEmoji}>{moodEmoji}</Text>
        </View>
        <Text style={styles.muted}>
          Intake: {totalIntake.toFixed(0)} kcal • Burn: {totalBurn.toFixed(0)} kcal
        </Text>

        <View style={styles.graphRow}>
          <Text style={styles.graphLabel}>Intake</Text>
          <View style={styles.graphBarBackground}>
            <View style={[styles.graphBarIntake, { width: `${intakePct}%` }]} />
          </View>
          <Text style={styles.graphValue}>{totalIntake.toFixed(0)}</Text>
        </View>

        <View style={styles.graphRow}>
          <Text style={styles.graphLabel}>Burn</Text>
          <View style={styles.graphBarBackground}>
            <View style={[styles.graphBarBurn, { width: `${burnPct}%` }]} />
          </View>
          <Text style={styles.graphValue}>{totalBurn.toFixed(0)}</Text>
        </View>

        <View style={styles.netRow}>
          <Text style={styles.netLabel}>Net</Text>
          <Text
            style={[
              styles.netValue,
              net < 0 ? styles.netDeficit : styles.netSurplus,
            ]}
          >
            {net > 0 ? `+${net.toFixed(0)} kcal` : `${net.toFixed(0)} kcal`}
          </Text>
        </View>

        <Text style={styles.moodText}>{moodLabel}</Text>
      </View>

      {/* Macro pie-style breakdown (simulated with stacked bars) */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>Macro balance</Text>
          <Text style={styles.cardEmoji}>🥦🍚🧈</Text>
        </View>
        <Text style={styles.muted}>
          Protein {protein}g • Carbs {carbs}g • Fats {fats}g
        </Text>

        <View style={styles.pieWrapper}>
          <View style={styles.pieBar}>
            <View
              style={[
                styles.pieSegmentProtein,
                { flex: proteinPct || 1 },
              ]}
            />
            <View
              style={[
                styles.pieSegmentCarbs,
                { flex: carbPct || 1 },
              ]}
            />
            <View
              style={[
                styles.pieSegmentFats,
                { flex: fatPct || 1 },
              ]}
            />
          </View>
        </View>

        <View style={styles.legendRow}>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#34d399' }]} />
            <Text style={styles.legendLabel}>
              Protein {proteinPct.toFixed(0)}%
            </Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#60a5fa' }]} />
            <Text style={styles.legendLabel}>
              Carbs {carbPct.toFixed(0)}%
            </Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#f97316' }]} />
            <Text style={styles.legendLabel}>
              Fats {fatPct.toFixed(0)}%
            </Text>
          </View>
        </View>
      </View>

      {/* Gratification card */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>Streak &amp; vibes</Text>
          <Text style={styles.cardEmoji}>🌟</Text>
        </View>

        <View style={styles.streakRow}>
          <Text style={styles.streakNumber}>3</Text>
          <Text style={styles.streakLabel}>days on-track streak</Text>
        </View>

        <Text style={styles.muted}>
          Keep logging your meals in Vision Notes and asking TrackMyFood for your plan.
          Every photo and note makes your coach smarter 📷🧠
        </Text>

        <View style={styles.badgeRow}>
          <Text style={styles.badge}>🔥 Deficit Hero</Text>
          <Text style={styles.badge}>🥗 Mindful Eater</Text>
        </View>

        <Text style={styles.gratitudeText}>
          You showed up today. That&apos;s the hardest part. 💚
        </Text>
      </View>
    </ScrollView>
  );
};

export default SummaryScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#020617',
  },
  content: {
    padding: 20,
    paddingBottom: 32,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 4,
    color: '#f9fafb',
  },
  subtitle: {
    fontSize: 13,
    textAlign: 'center',
    marginBottom: 16,
    color: '#9ca3af',
  },
  card: {
    backgroundColor: '#020617',
    borderRadius: 16,
    padding: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#1f2937',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#f9fafb',
  },
  cardEmoji: {
    fontSize: 20,
  },
  muted: {
    fontSize: 12,
    color: '#9ca3af',
    marginBottom: 8,
  },
  graphRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
    marginTop: 2,
    gap: 8,
  },
  graphLabel: {
    width: 52,
    fontSize: 12,
    color: '#e5e7eb',
  },
  graphBarBackground: {
    flex: 1,
    height: 10,
    borderRadius: 999,
    backgroundColor: '#111827',
    overflow: 'hidden',
  },
  graphBarIntake: {
    height: '100%',
    borderRadius: 999,
    backgroundColor: '#fb923c',
  },
  graphBarBurn: {
    height: '100%',
    borderRadius: 999,
    backgroundColor: '#22c55e',
  },
  graphValue: {
    width: 60,
    fontSize: 12,
    textAlign: 'right',
    color: '#9ca3af',
  },
  netRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
    marginBottom: 4,
  },
  netLabel: {
    fontSize: 13,
    color: '#e5e7eb',
  },
  netValue: {
    fontSize: 13,
    fontWeight: '600',
  },
  netDeficit: {
    color: '#22c55e',
  },
  netSurplus: {
    color: '#f97316',
  },
  moodText: {
    fontSize: 12,
    color: '#9ca3af',
  },
  pieWrapper: {
    marginTop: 10,
    marginBottom: 8,
  },
  pieBar: {
    flexDirection: 'row',
    height: 18,
    borderRadius: 999,
    overflow: 'hidden',
  },
  pieSegmentProtein: {
    backgroundColor: '#34d399',
  },
  pieSegmentCarbs: {
    backgroundColor: '#60a5fa',
  },
  pieSegmentFats: {
    backgroundColor: '#f97316',
  },
  legendRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendLabel: {
    fontSize: 11,
    color: '#e5e7eb',
  },
  streakRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 4,
    marginBottom: 4,
  },
  streakNumber: {
    fontSize: 24,
    fontWeight: '700',
    color: '#22c55e',
  },
  streakLabel: {
    fontSize: 13,
    color: '#e5e7eb',
    marginBottom: 2,
  },
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 8,
    marginBottom: 6,
  },
  badge: {
    fontSize: 11,
    color: '#f97316',
    backgroundColor: '#111827',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#1f2937',
  },
  gratitudeText: {
    fontSize: 12,
    color: '#9ca3af',
    marginTop: 4,
  },
});