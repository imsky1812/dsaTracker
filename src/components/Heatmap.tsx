import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { Palette, spacing, type } from '../theme/tokens';
import { useColors, useThemedStyles } from '../theme/theme';
import { dayKey } from '../lib/dates';

// Signature element: a GitHub-style contribution heatmap of problems solved
// per day, 18 weeks back.

const WEEKS = 18;
const CELL = 13;
const GAP = 4;

export function Heatmap({ activity }: { activity: Record<string, number> }) {
  const c = useColors();
  const s = useThemedStyles(makeStyles);

  const heatColor = (count: number) =>
    count <= 0 ? c.heat0 : count === 1 ? c.heat1 : count === 2 ? c.heat2 : count <= 4 ? c.heat3 : c.heat4;

  const today = new Date();
  const dayOfWeek = today.getDay(); // 0 Sun
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

  return (
    <View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={{ flexDirection: 'row' }}>
          {columns.map((col, wi) => (
            <View key={wi} style={{ marginRight: GAP }}>
              {col.map((cell, di) => (
                <View
                  key={di}
                  style={{
                    width: CELL,
                    height: CELL,
                    borderRadius: 4,
                    marginBottom: GAP,
                    backgroundColor: cell.count < 0 ? 'transparent' : heatColor(cell.count),
                  }}
                />
              ))}
            </View>
          ))}
        </View>
      </ScrollView>
      <View style={s.legend}>
        <Text style={s.legendText}>Less</Text>
        {[c.heat0, c.heat1, c.heat2, c.heat3, c.heat4].map((colour, i) => (
          <View key={i} style={{ width: 11, height: 11, borderRadius: 3, backgroundColor: colour, marginHorizontal: 2 }} />
        ))}
        <Text style={s.legendText}>More</Text>
      </View>
    </View>
  );
}

const makeStyles = (c: Palette) => StyleSheet.create({
  legend: { flexDirection: 'row', alignItems: 'center', marginTop: spacing.lg, alignSelf: 'flex-end' },
  legendText: { fontFamily: type.mono, fontSize: 11, color: c.textFaint, marginHorizontal: 6 },
});
