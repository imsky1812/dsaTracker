import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { colors, spacing, type } from '../theme/tokens';
import { dayKey } from '../lib/dates';

// Signature element: a GitHub-style contribution heatmap of problems solved
// per day. Reads the activity map from the store. 18 weeks back.

const WEEKS = 18;
const CELL = 13;
const GAP = 3;

function heatColor(count: number) {
  if (count <= 0) return colors.heat0;
  if (count === 1) return colors.heat1;
  if (count === 2) return colors.heat2;
  if (count <= 4) return colors.heat3;
  return colors.heat4;
}

export function Heatmap({ activity }: { activity: Record<string, number> }) {
  const today = new Date();
  const dayOfWeek = today.getDay(); // 0 Sun
  // start on the Sunday WEEKS ago
  const start = new Date(today);
  start.setDate(today.getDate() - dayOfWeek - (WEEKS - 1) * 7);

  const columns: { date: string; count: number }[][] = [];
  for (let w = 0; w < WEEKS; w++) {
    const col: { date: string; count: number }[] = [];
    for (let d = 0; d < 7; d++) {
      const cur = new Date(start);
      cur.setDate(start.getDate() + w * 7 + d);
      // Local-calendar key — must match what the store writes, or every square
      // is shifted a day in any timezone east of UTC.
      const key = dayKey(cur);
      const future = cur > today;
      col.push({ date: key, count: future ? -1 : activity[key] ?? 0 });
    }
    columns.push(col);
  }

  const monthLabels = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

  return (
    <View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View>
          <View style={{ flexDirection: 'row' }}>
            {columns.map((col, wi) => (
              <View key={wi} style={{ marginRight: GAP }}>
                {col.map((cell, di) => (
                  <View
                    key={di}
                    style={{
                      width: CELL, height: CELL, borderRadius: 3, marginBottom: GAP,
                      backgroundColor: cell.count < 0 ? 'transparent' : heatColor(cell.count),
                      borderWidth: cell.count === 0 ? 1 : 0, borderColor: colors.borderSoft,
                    }}
                  />
                ))}
              </View>
            ))}
          </View>
        </View>
      </ScrollView>
      <View style={styles.legend}>
        <Text style={styles.legendText}>Less</Text>
        {[colors.heat0, colors.heat1, colors.heat2, colors.heat3, colors.heat4].map((c, i) => (
          <View key={i} style={{ width: 11, height: 11, borderRadius: 3, backgroundColor: c, marginHorizontal: 2 }} />
        ))}
        <Text style={styles.legendText}>More</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  legend: { flexDirection: 'row', alignItems: 'center', marginTop: spacing.md, alignSelf: 'flex-end' },
  legendText: { fontFamily: type.mono, fontSize: 11, color: colors.textFaint, marginHorizontal: 6 },
});
