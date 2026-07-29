'use client';

import { useState } from 'react';
import useSWR, { mutate } from 'swr';
import NavBar from '@/components/NavBar';
import { fetcher, Subject, TimetableSlot } from '@/lib/types';

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export default function SetupPage() {
  const [day, setDay] = useState('Mon');

  const { data: subjectsData } = useSWR<{ subjects: Subject[]; error?: string }>(
    '/api/subjects',
    fetcher
  );
  const timetableKey = `/api/timetable?day=${day}`;
  const { data: timetableData } = useSWR<{ slots: TimetableSlot[]; error?: string }>(
    timetableKey,
    fetcher
  );

  const subjects = subjectsData?.subjects ?? [];
  const slots = timetableData?.slots ?? [];
  const apiError = subjectsData?.error || timetableData?.error;

  // count how many times each subject is already added today, just for the badge
  const countsBySubject: Record<string, number> = {};
  slots.forEach((s) => {
    countsBySubject[s.subjectId] = (countsBySubject[s.subjectId] ?? 0) + 1;
  });

  async function addSlot(subjectId: string) {
    await fetch('/api/timetable', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ day, subjectId, action: 'add' }),
    });
    mutate(timetableKey);
  }

  async function removeSlot(slotId: string) {
    // optimistic update
    if (timetableData) {
      mutate(
        timetableKey,
        { slots: timetableData.slots.filter((s) => s.slotId !== slotId) },
        false
      );
    }
    await fetch('/api/timetable', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ day, slotId, action: 'remove' }),
    });
    mutate(timetableKey);
  }

  return (
    <>
      <header className="header">
        <p className="header-title">Setup</p>
        <h1 className="header-date">Day-wise subjects</h1>
      </header>

      <div className="content">
        <div className="day-tabs">
          {DAYS.map((d) => (
            <button
              key={d}
              type="button"
              className="day-tab"
              data-active={day === d}
              onClick={() => setDay(d)}
            >
              {d}
            </button>
          ))}
        </div>

        {apiError && (
          <div className="banner" data-tone="negative" style={{ marginTop: 12 }}>
            Couldn't load data: {apiError}. Check GAS_URL / GAS_TOKEN in your environment
            variables, and that your Google Sheet tab names match exactly.
          </div>
        )}

        {!apiError && (
          <>
            <p className="section-label">
              Tap a subject to add it to {day}. Tap it again if it happens twice that day.
            </p>

            <div className="chip-grid">
              {subjects.map((s) => {
                const count = countsBySubject[s.subjectId] ?? 0;
                return (
                  <button
                    key={s.subjectId}
                    type="button"
                    className="chip"
                    data-added={count > 0}
                    onClick={() => addSlot(s.subjectId)}
                  >
                    {s.subjectName}
                    <span className="chip-type">
                      {s.type}{count > 0 ? ` · ${count}` : ''}
                    </span>
                  </button>
                );
              })}
              {subjects.length === 0 && (
                <p className="empty-state">
                  No subjects found. Add rows to the "Subjects" tab in your Google Sheet first.
                </p>
              )}
            </div>

            <p className="section-label">{day}'s classes</p>
            <div className="ledger">
              {slots.map((s) => (
                <div className="ledger-row" key={s.slotId}>
                  <div className="ledger-row-main">
                    <p className="ledger-subject">{s.subjectName}</p>
                    <span className="ledger-type">{s.type}</span>
                  </div>
                  <button
                    type="button"
                    className="mark-btn"
                    data-kind="skip"
                    data-active="true"
                    aria-label={`Remove ${s.subjectName} from ${day}`}
                    onClick={() => removeSlot(s.slotId)}
                  >
                    ×
                  </button>
                </div>
              ))}
              {slots.length === 0 && (
                <p className="empty-state">No classes added to {day} yet.</p>
              )}
            </div>
          </>
        )}
      </div>

      <NavBar />
    </>
  );
}
