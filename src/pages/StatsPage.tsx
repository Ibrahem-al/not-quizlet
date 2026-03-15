/**
 * Analytics dashboard: study heatmap, time per mode, streak.
 */

import { useMemo, useEffect, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
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
      byDay,
      totalReviews,
      totalTimeMs,
      maxStreak,
    };
  }, [sets]);
}

function AnimatedCounter({ value, suffix = '' }: { value: number; suffix?: string }) {
  const [display, setDisplay] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (value === 0) { setDisplay(0); return; }
    const duration = 600;
    const start = performance.now();
    const step = (now: number) => {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic
      setDisplay(Math.round(eased * value));
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [value]);

  return <span ref={ref}>{display}{suffix}</span>;
}

function StudyHeatmap({ byDay }: { byDay: Record<string, number> }) {
  const weeks = useMemo(() => {
    const result: { date: Date; count: number }[][] = [];
    const today = new Date();
    // Go back ~12 weeks (84 days)
    const start = new Date(today);
    start.setDate(start.getDate() - 83);
    // Align to Sunday
    start.setDate(start.getDate() - start.getDay());

    let currentWeek: { date: Date; count: number }[] = [];
    const d = new Date(start);
    while (d <= today) {
      currentWeek.push({ date: new Date(d), count: byDay[d.toDateString()] ?? 0 });
      if (currentWeek.length === 7) {
        result.push(currentWeek);
        currentWeek = [];
      }
      d.setDate(d.getDate() + 1);
    }
    if (currentWeek.length > 0) result.push(currentWeek);
    return result;
  }, [byDay]);

  const maxCount = useMemo(() => Math.max(1, ...Object.values(byDay)), [byDay]);

  const getColor = (count: number) => {
    if (count === 0) return 'var(--color-surface-muted)';
    const intensity = Math.min(count / maxCount, 1);
    if (intensity <= 0.25) return 'rgba(var(--color-primary-rgb), 0.2)';
    if (intensity <= 0.5) return 'rgba(var(--color-primary-rgb), 0.4)';
    if (intensity <= 0.75) return 'rgba(var(--color-primary-rgb), 0.65)';
    return 'rgba(var(--color-primary-rgb), 0.9)';
  };

  const dayLabels = ['', 'Mon', '', 'Wed', '', 'Fri', ''];

  return (
    <div className="flex gap-1">
      <div className="flex flex-col gap-1 mr-1 text-[10px] text-[var(--color-text-tertiary)]">
        {dayLabels.map((label, i) => (
          <div key={i} className="h-3 flex items-center">{label}</div>
        ))}
      </div>
      {weeks.map((week, wi) => (
        <div key={wi} className="flex flex-col gap-1">
          {week.map((day, di) => (
            <div
              key={di}
              className="w-3 h-3 rounded-sm transition-colors"
              style={{ backgroundColor: getColor(day.count) }}
              title={`${day.date.toLocaleDateString()}: ${day.count} review${day.count !== 1 ? 's' : ''}`}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

const cardEntrance = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.35, ease: [0.33, 1, 0.68, 1] as const },
};

export function StatsPage() {
  const { modeData, last28Days, byDay, totalReviews, totalTimeMs, maxStreak } = useStudyStats();

  return (
    <AppLayout breadcrumbs={[{ label: 'Stats' }]}>
      <div className="space-y-8">
        <h1 className="text-2xl font-semibold text-[var(--color-text)]">Analytics</h1>

        <section className="grid gap-4 sm:grid-cols-3">
          <motion.div {...cardEntrance} transition={{ ...cardEntrance.transition, delay: 0 }} className="rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[var(--shadow-card)] p-5">
            <p className="text-sm font-medium text-[var(--color-text-secondary)]">Total reviews</p>
            <p className="text-2xl font-semibold text-[var(--color-text)] mt-1"><AnimatedCounter value={totalReviews} /></p>
          </motion.div>
          <motion.div {...cardEntrance} transition={{ ...cardEntrance.transition, delay: 0.08 }} className="rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[var(--shadow-card)] p-5">
            <p className="text-sm font-medium text-[var(--color-text-secondary)]">Time studied</p>
            <p className="text-2xl font-semibold text-[var(--color-text)] mt-1">
              {totalTimeMs >= 60000
                ? <><AnimatedCounter value={Math.round(totalTimeMs / 60000 * 10) / 10} /> min</>
                : <><AnimatedCounter value={Math.round(totalTimeMs / 1000)} /> s</>}
            </p>
          </motion.div>
          <motion.div {...cardEntrance} transition={{ ...cardEntrance.transition, delay: 0.16 }} className="rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[var(--shadow-card)] p-5">
            <p className="text-sm font-medium text-[var(--color-text-secondary)]">Best streak</p>
            <p className="text-2xl font-semibold text-[var(--color-text)] mt-1"><AnimatedCounter value={maxStreak} suffix=" days" /></p>
          </motion.div>
        </section>

        <motion.section {...cardEntrance} transition={{ ...cardEntrance.transition, delay: 0.24 }} className="rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-surface)] p-4 sm:p-5 shadow-[var(--shadow-card)]" aria-labelledby="reviews-by-mode-heading">
          <h2 id="reviews-by-mode-heading" className="text-lg font-semibold text-[var(--color-text)] mb-3">Reviews by mode</h2>
          <div className="h-64" aria-hidden="true">
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
          {/* Screen-reader accessible data table */}
          <table className="sr-only">
            <caption>Reviews by study mode</caption>
            <thead><tr><th>Mode</th><th>Reviews</th></tr></thead>
            <tbody>
              {modeData.map((d) => (
                <tr key={d.name}><td>{d.name}</td><td>{d.value}</td></tr>
              ))}
            </tbody>
          </table>
        </motion.section>

        <motion.section {...cardEntrance} transition={{ ...cardEntrance.transition, delay: 0.32 }} className="rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-surface)] p-4 sm:p-5 shadow-[var(--shadow-card)]" aria-labelledby="study-heatmap-heading">
          <h2 id="study-heatmap-heading" className="text-lg font-semibold text-[var(--color-text)] mb-3">Study activity</h2>
          <div className="overflow-x-auto">
            <StudyHeatmap byDay={byDay} />
          </div>
          <div className="flex items-center gap-1.5 mt-3 text-[10px] text-[var(--color-text-tertiary)]">
            <span>Less</span>
            {[0, 0.25, 0.5, 0.75, 1].map((intensity) => (
              <div
                key={intensity}
                className="w-3 h-3 rounded-sm"
                style={{
                  backgroundColor: intensity === 0
                    ? 'var(--color-surface-muted)'
                    : `rgba(var(--color-primary-rgb), ${intensity * 0.9})`,
                }}
              />
            ))}
            <span>More</span>
          </div>
        </motion.section>

        <motion.section {...cardEntrance} transition={{ ...cardEntrance.transition, delay: 0.4 }} className="rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-surface)] p-4 sm:p-5 shadow-[var(--shadow-card)]" aria-labelledby="last-28-days-heading">
          <h2 id="last-28-days-heading" className="text-lg font-semibold text-[var(--color-text)] mb-3">Last 28 days</h2>
          <div className="h-48" aria-hidden="true">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={last28Days} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 10 }} />
                <Tooltip />
                <Bar dataKey="count" fill="var(--color-primary)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          {/* Screen-reader accessible data table */}
          <table className="sr-only">
            <caption>Daily review counts for the last 28 days</caption>
            <thead><tr><th>Date</th><th>Reviews</th></tr></thead>
            <tbody>
              {last28Days.filter((d) => d.count > 0).map((d) => (
                <tr key={d.date}><td>{d.date}</td><td>{d.count}</td></tr>
              ))}
            </tbody>
          </table>
        </motion.section>

        <p className="text-sm">
          <Link
            to="/"
            className="text-[var(--color-text-secondary)] hover:text-[var(--color-primary)] font-medium transition-colors"
          >
            Back to Home
          </Link>
        </p>
      </div>
    </AppLayout>
  );
}
