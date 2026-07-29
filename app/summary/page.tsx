'use client';

import useSWR from 'swr';
import NavBar from '@/components/NavBar';
import { fetcher, SummaryData } from '@/lib/types';

export default function SummaryPage() {
  const { data, isLoading } = useSWR<SummaryData & { error?: string }>('/api/summary', fetcher, {
    revalidateOnFocus: true,
  });
  const apiError = data?.error;

  return (
    <>
      <header className="header">
        <p className="header-title">Summary</p>
        <h1 className="header-date">Attendance</h1>
      </header>

      <div className="content">
        {isLoading && <p className="empty-state">Loading summary…</p>}

        {apiError && (
          <div className="banner" data-tone="negative" style={{ marginTop: 12 }}>
            Couldn't load data: {apiError}. Check GAS_URL / GAS_TOKEN in your environment
            variables, and that your Google Sheet tab names match exactly.
          </div>
        )}

        {data && !apiError && (
          <>
            <OverallBlock
              label={`Overall (including labs) · min ${data.minPercent}%`}
              stats={data.overallWithLabs}
              minPercent={data.minPercent}
            />
            <OverallBlock
              label={`All classes, excluding labs · min ${data.minPercent}%`}
              stats={data.allLecturesOnly}
              minPercent={data.minPercent}
            />

            <p className="section-label">By subject</p>
            <div className="ledger">
              {data.perSubject.map((s) => (
                <div className="summary-row" key={s.subjectId}>
                  <div>
                    <div className="summary-name">{s.name}</div>
                    <div className="summary-frac mono">
                      {s.attended}/{s.total} classes
                      {s.total > 0 && (
                        <>
                          {s.percent < data.minPercent
                            ? ` · needs ${s.neededToReach} more`
                            : s.canSkip > 0
                            ? ` · can skip ${s.canSkip}`
                            : ''}
                        </>
                      )}
                    </div>
                  </div>
                  <div
                    className="summary-percent mono"
                    data-below={s.percent < data.minPercent}
                  >
                    {s.total === 0 ? '—' : `${s.percent}%`}
                  </div>
                </div>
              ))}
              {data.perSubject.length === 0 && (
                <p className="empty-state">No attendance marked yet.</p>
              )}
            </div>
          </>
        )}
      </div>

      <NavBar />
    </>
  );
}

function OverallBlock({
  label,
  stats,
  minPercent,
}: {
  label: string;
  stats: SummaryData['overallWithLabs'];
  minPercent: number;
}) {
  const below = stats.total > 0 && stats.percent < minPercent;

  return (
    <div className="overall-card">
      <p className="overall-label">{label}</p>
      <p className="overall-value mono">
        {stats.total === 0 ? '—' : `${stats.percent}%`}
        {stats.total > 0 && (
          <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--ink-muted)' }}>
            {'  '}({stats.attended}/{stats.total})
          </span>
        )}
      </p>

      {stats.total > 0 && (
        <div
          className="banner"
          data-tone={below ? 'negative' : 'positive'}
          style={{ marginTop: 10 }}
        >
          {below
            ? `Attend the next ${stats.neededToReach} classes in a row to reach ${minPercent}%.`
            : stats.canSkip > 0
            ? `You can miss ${stats.canSkip} more class${stats.canSkip === 1 ? '' : 'es'} and stay at or above ${minPercent}%.`
            : `Right at ${minPercent}% — attend your next class to stay safe.`}
        </div>
      )}
    </div>
  );
}
