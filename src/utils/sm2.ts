import { SrsCard } from '../types/schema';

export type Sm2Rating = 1 | 2 | 3 | 4;

export const SM2_OPTIONS: Array<{
  rating: Sm2Rating;
  label: string;
  keyHint: string;
  baseIntervalLabel: string;
}> = [
  { rating: 1, label: 'Chưa nhớ', keyHint: '1', baseIntervalLabel: '10 phút' },
  { rating: 2, label: 'Khó', keyHint: '2', baseIntervalLabel: '1 ngày' },
  { rating: 3, label: 'Nhớ', keyHint: '3', baseIntervalLabel: '2 ngày' },
  { rating: 4, label: 'Dễ', keyHint: '4', baseIntervalLabel: '3 ngày' },
];

export function scheduleSm2(card: SrsCard, rating: Sm2Rating, now = Date.now()): SrsCard {
  const DAY = 86400;
  let intervalSeconds = 600;
  let easeFactor = card.easeFactor || 2.5;
  let repetitions = card.repetitions || 0;

  if (rating === 1) {
    intervalSeconds = 600; // 10 minutes
    repetitions = 0;
    easeFactor = Math.max(1.3, easeFactor - 0.2);
  } else if (rating === 2) {
    intervalSeconds = repetitions === 0 ? DAY : Math.round(Math.max(DAY, card.intervalSeconds * 1.2));
    repetitions += 1;
    easeFactor = Math.max(1.3, easeFactor - 0.15);
  } else if (rating === 3) {
    intervalSeconds =
      repetitions === 0 ? 2 * DAY : Math.round(Math.max(2 * DAY, card.intervalSeconds * easeFactor));
    repetitions += 1;
  } else {
    intervalSeconds =
      repetitions === 0
        ? 3 * DAY
        : Math.round(Math.max(3 * DAY, card.intervalSeconds * easeFactor * 1.3));
    repetitions += 1;
    easeFactor = Math.min(3.0, easeFactor + 0.15);
  }

  const status: 'learning' | 'mastered' =
    repetitions >= 3 && intervalSeconds >= 3 * DAY ? 'mastered' : 'learning';

  return {
    ...card,
    intervalSeconds,
    easeFactor: Number(easeFactor.toFixed(2)),
    repetitions,
    status,
    dueAt: now + intervalSeconds * 1000,
  };
}

export function formatDueLabel(dueAt: number, now = Date.now()): string {
  const diffSec = Math.round((dueAt - now) / 1000);
  if (diffSec <= 0) return 'tới hạn';
  if (diffSec < 60) return `sau ${diffSec} giây`;
  const mins = Math.round(diffSec / 60);
  if (mins < 60) return `sau ${mins} phút`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `sau ${hours} giờ`;
  const days = Math.round(hours / 24);
  return `sau ${days} ngày`;
}
