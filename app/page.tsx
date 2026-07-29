'use client';

import { useState } from 'react';
import useSWR, { mutate } from 'swr';
import NavBar from '@/components/NavBar';
import { fetcher, todayStr, ClassItem } from '@/lib/types';

export default function TodayPage() {
  const [date, setDate] = useState(todayStr());
  const key = `/api/day-classes?date=${date}`;
  const { data, error, isLoading } = useSWR<{ day: string; classes: ClassItem[]; error?: string }>(
    key,
    fetcher,
    { revalidateOnFocus: true }
  );

  const classes = data?.classes ?? [];
  const apiError = data?.error || (error ? String(error) : null);

  async function mark(slotId: string, subjectId: string, status: 'Attended' | 'Not Attended') {
    // optimistic update so the tap feels instant
    if (data) {
      const next = {
        ...data,
        classes: classes.map((c) =>
          c.slotId === slotId ? { ...c, status } : c
        ),
      };
      mutate(key, next, false);
    }

    await fetch('/api/mark-attendance', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ date, slotId, subjectId, status }),
    });

    mutate(key);
    mutate('/api/summary');
  }

  return (
    <>
      <header className="header">
        <p className="header-title">Today</p>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <h1 className="header-date">
            {data?.day ? `${data.day}` : '—'}
          </h1>
          <input
            type="date"
            className="date-input"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </div>
      </header>

      <div className="content">
        {isLoading && <p className="empty-state">Loading classes…</p>}

        {apiError && (
          <div className="banner" data-tone="negative" style={{ marginTop: 12 }}>
            Couldn't load data: {apiError}. Check GAS_URL / GAS_TOKEN in your environment
            variables, and that your Google Sheet tab names match exactly.
          </div>
        )}

        {!isLoading && !apiError && classes.length === 0 && (
          <p className="empty-state">
            No classes set up for this day yet.<br />Add subjects from the Setup tab.
          </p>
        )}

        {!isLoading && !apiError && classes.length > 0 && (
          <div className="ledger">
            {classes.map((c) => (
              <div className="ledger-row" key={c.slotId}>
                <div className="ledger-row-main">
                  <p className="ledger-subject">{c.subjectName}</p>
                  <span className="ledger-type">{c.type}</span>
                </div>
                <div className="ledger-actions">
                  <button
                    type="button"
                    className="mark-btn"
                    data-kind="attend"
                    data-active={c.status === 'Attended'}
                    aria-label={`Mark ${c.subjectName} attended`}
                    onClick={() => mark(c.slotId, c.subjectId, 'Attended')}
                  >
                    ✓
                  </button>
                  <button
                    type="button"
                    className="mark-btn"
                    data-kind="skip"
                    data-active={c.status === 'Not Attended'}
                    aria-label={`Mark ${c.subjectName} not attended`}
                    onClick={() => mark(c.slotId, c.subjectId, 'Not Attended')}
                  >
                    ✕
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <NavBar />
    </>
  );
}
