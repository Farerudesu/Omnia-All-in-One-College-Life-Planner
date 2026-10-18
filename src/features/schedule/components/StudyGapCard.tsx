import { toDateString } from '@/lib/dateUtils';
import * as ds from '@/lib/dataService';
import type { StudyGapInfo } from './ScheduleRightPanel';

interface StudyGapCardProps {
  studyGap: StudyGapInfo;
  podReservation: ds.PodReservation | null;
}

export function StudyGapCard({ studyGap, podReservation }: StudyGapCardProps) {
  return (
    <div className="card" style={{ margin: '0.75rem 1rem', padding: '0.875rem' }}>
      <div
        style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}
      >
        <div
          style={{
            width: 36,
            height: 36,
            borderRadius: '50%',
            background: 'var(--secondary-container)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="var(--on-secondary-container)"
            strokeWidth="2"
            aria-hidden="true"
          >
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
          </svg>
        </div>
        <div>
          <h4 style={{ fontSize: '0.9375rem' }}>Study gap detected</h4>
          <p
            className="tabular-nums"
            style={{ fontSize: '0.75rem', color: 'var(--on-surface-variant)' }}
          >
            {studyGap.hours} hours free between {studyGap.before} & {studyGap.after}
          </p>
        </div>
      </div>

      {podReservation ? (
        <div
          style={{
            padding: '0.5rem 0.75rem',
            borderRadius: 6,
            background: 'var(--primary-container)',
            color: 'var(--on-primary-container)',
            fontSize: '0.75rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <div style={{ fontWeight: 700 }}>✓ {podReservation.name} Reserved</div>
            <div style={{ fontSize: '0.6875rem', opacity: 0.85 }}>
              {podReservation.location} ({podReservation.timeSlot})
            </div>
          </div>
          <button
            type="button"
            onClick={() => ds.cancelPodReservation()}
            className="btn-ghost"
            style={{
              fontSize: '0.6875rem',
              padding: '0.2rem 0.4rem',
              color: 'var(--on-primary-container)',
            }}
          >
            Release
          </button>
        </div>
      ) : (
        <button
          type="button"
          className="btn-outline"
          onClick={() =>
            ds.reservePod({
              podId: 'pod-b14',
              name: 'Pod B-14',
              location: 'Main Library 2nd Floor',
              timeSlot: `${studyGap.before} – ${studyGap.after}`,
              date: toDateString(new Date()),
            })
          }
          style={{
            width: '100%',
            justifyContent: 'center',
            fontSize: '0.75rem',
            padding: '0.4rem',
          }}
        >
          Reserve Quiet Pod (Library Floor 2)
        </button>
      )}
    </div>
  );
}
