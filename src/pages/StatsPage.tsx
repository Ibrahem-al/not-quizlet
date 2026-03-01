/**
 * Analytics dashboard: study heatmap, time per mode, streak.
 */

import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import { AppLayout } from '../components/layout/AppLayout';
import { useStudyStore } from '../stores/studyStore';
import type { ReviewLog } from '../types';

const MODE_COLORS: Record<string, string> = {
  flashcards: 'var(--color-primary)',
  learn: '#22c55e',
  match: '#eab308',
  test: '#a855f7',
};

function useStudyStats() {
  const sets = useStudyStore((s) => s.sets);

  return useMemo(() => {
    const byMode: Record<string, number> = {};
    const byDay: Record<string, number> = {};
    let totalReviews = 0;
    let totalTimeMs = 0;
    let maxStreak = 0;

    for (const set of sets) {
      maxStreak = Math.max(maxStreak, set.studyStats?.streakDays ?? 0);
      for (const card of set.cards ?? []) {
        for (const log of card.history ?? []) {
          const mode = (log as ReviewLog).mode ?? 'flashcards';
          byMode[mode] = (byMode[mode] ?? 0) + 1;
          totalReviews += 1;
          const time = (log as ReviewLog).timeSpent ?? 0;
          totalTimeMs += time;
          const day = new Date((log as ReviewLog).date).toDateString();
          byDay[day] = (byDay[day] ?? 0) + 1;
        }
      }
    }

    const modeData = Object.entries(byMode).map(([name, value]) => ({
      name: name.charAt(0).toUpperCase() + name.slice(1),
      value,
      fill: MODE_COLORS[name] ?? '#64748b',
    }));

    const last28Days = Array.from({ length: 28 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (27 - i));
      const day = d.toDateString();
      return { date: d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }), count: byDay[day] ?? 0 };
    });

    return {
      modeData: modeData.length ? modeData : [{ name: 'No data', value: 1, fill: '#94a3b8' }],
      last28Days,
      totalReviews,
      totalTimeMs,
      maxStreak,
    };
  }, [sets]);
}

export function StatsPage() {
  const { modeData, last28Days, totalReviews, totalTimeMs, maxStreak } = useStudyStats();

  return (
    <AppLayout breadcrumbs={[{ label: 'Stats' }]}>
      <div className="space-y-8">
        <h1 className="text-2xl font-bold text-[var(--color-text)]">Analytics</h1>

        <section className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-lg border border-[var(--color-text-secondary)]/20 bg-[var(--color-surface)] p-4">
            <p className="text-sm text-[var(--color-text-secondary)]">Total reviews</p>
            <p className="text-2xl font-bold text-[var(--color-text)]">{totalReviews}</p>
          </div>
          <div className="rounded-lg border border-[var(--color-text-secondary)]/20 bg-[var(--color-surface)] p-4">
            <p className="text-sm text-[var(--color-text-secondary)]">Time studied</p>
            <p className="text-2xl font-bold text-[var(--color-text)]">
              {totalTimeMs >= 60000
                ? `${(totalTimeMs / 60000).toFixed(1)} min`
                : `${(totalTimeMs / 1000).toFixed(0)} s`}
            </p>
          </div>
          <div className="rounded-lg border border-[var(--color-text-secondary)]/20 bg-[var(--color-surface)] p-4">
            <p className="text-sm text-[var(--color-text-secondary)]">Best streak</p>
            <p className="text-2xl font-bold text-[var(--color-text)]">{maxStreak} days</p>
          </div>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-[var(--color-text)] mb-3">Reviews by mode</h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={modeData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  label={({ name, value }) => `${name}: ${value}`}
                />
                {modeData.map((entry, i) => (
                  <Cell key={i} fill={entry.fill} />
                ))}
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-[var(--color-text)] mb-3">Last 28 days</h2>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={last28Days} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 10 }} />
                <Tooltip />
                <Bar dataKey="count" fill="var(--color-primary)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>

        <p className="text-sm text-[var(--color-text-secondary)]">
          <Link to="/" className="underline hover:text-[var(--color-primary)]">Back to Home</Link>
        </p>
      </div>
    </AppLayout>
  );
}
