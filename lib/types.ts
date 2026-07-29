export const fetcher = (url: string) => fetch(url).then((res) => res.json());

export function todayStr(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export type ClassItem = {
  slotId: string;
  subjectId: string;
  subjectName: string;
  type: 'Lecture' | 'Lab';
  status: 'Attended' | 'Not Attended' | null;
};

export type TimetableSlot = {
  slotId: string;
  subjectId: string;
  subjectName: string;
  type: 'Lecture' | 'Lab';
};

export type Subject = {
  subjectId: string;
  subjectName: string;
  type: 'Lecture' | 'Lab';
};

export type SubjectStats = {
  subjectId?: string;
  name?: string;
  type?: string;
  attended: number;
  total: number;
  percent: number;
  neededToReach: number;
  canSkip: number;
};

export type SummaryData = {
  perSubject: SubjectStats[];
  allLecturesOnly: SubjectStats;
  overallWithLabs: SubjectStats;
  minPercent: number;
};
