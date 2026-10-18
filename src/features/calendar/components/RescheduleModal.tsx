import { useState, useEffect } from 'react';
import { Modal } from '@/components/Modal';
import { useLanguage } from '@/lib/useLanguage';
import { toDateString } from '@/lib/dateUtils';
import * as ds from '@/lib/dataService';
import type { RescheduleItemState } from '../types';

interface RescheduleModalProps {
  item: RescheduleItemState | null;
  isOpen: boolean;
  onClose: () => void;
}

export function RescheduleModal({ item, isOpen, onClose }: RescheduleModalProps) {
  const lang = useLanguage();
  const [newDate, setNewDate] = useState(item?.date || toDateString(new Date()));
  const [newTime, setNewTime] = useState(item?.time || '10:00');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (item) {
      setNewDate(item.date);
      setNewTime(item.time || '10:00');
      setIsSubmitting(false);
    }
  }, [item, isOpen]);

  if (!item) return null;

  const handleSave = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      if (item.rawEvent) {
        await ds.updateEvent(item.rawEvent.id, {
          date: newDate,
          startTime: newTime || undefined,
        });
      } else if (item.rawAssignment) {
        await ds.updateAssignment(item.rawAssignment.id, {
          dueDate: `${newDate}T${newTime || '23:59'}`,
        });
      }
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={lang === 'id' ? 'Pindahkan Jadwal' : 'Reschedule Item'}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div
          style={{
            padding: '0.75rem 1rem',
            background: 'var(--surface-container-low)',
            borderRadius: 8,
            border: '1px solid var(--outline-variant)',
          }}
        >
          <div
            style={{
              fontSize: '0.75rem',
              color: 'var(--on-surface-variant)',
              marginBottom: '0.25rem',
              textTransform: 'uppercase',
              fontWeight: 600,
            }}
          >
            {item.type === 'assignment'
              ? lang === 'id'
                ? 'Tugas'
                : 'Assignment'
              : lang === 'id'
                ? 'Acara Kalender'
                : 'Calendar Event'}
          </div>
          <div style={{ fontWeight: 600, fontSize: '0.9375rem', color: 'var(--on-surface)' }}>
            {item.title}
          </div>
        </div>

        <div className="modal-form-grid-2col">
          <div>
            <label
              style={{
                display: 'block',
                fontSize: '0.8125rem',
                fontWeight: 600,
                marginBottom: '0.375rem',
              }}
            >
              {lang === 'id' ? 'Tanggal Baru *' : 'New Date *'}
            </label>
            <input
              type="date"
              value={newDate}
              onChange={(e) => setNewDate(e.target.value)}
              style={{ width: '100%' }}
              required
            />
          </div>
          <div>
            <label
              style={{
                display: 'block',
                fontSize: '0.8125rem',
                fontWeight: 600,
                marginBottom: '0.375rem',
              }}
            >
              {lang === 'id' ? 'Waktu Baru' : 'New Time'}
            </label>
            <input
              type="time"
              value={newTime}
              onChange={(e) => setNewTime(e.target.value)}
              style={{ width: '100%' }}
            />
          </div>
        </div>

        <div className="modal-actions-sticky">
          <button type="button" className="btn-outline" onClick={onClose} disabled={isSubmitting}>
            {lang === 'id' ? 'Batal' : 'Cancel'}
          </button>
          <button
            type="button"
            className="btn-primary"
            onClick={handleSave}
            disabled={isSubmitting}
          >
            {isSubmitting
              ? lang === 'id'
                ? 'Memindahkan…'
                : 'Moving…'
              : lang === 'id'
                ? 'Simpan Jadwal Baru'
                : 'Save New Schedule'}
          </button>
        </div>
      </div>
    </Modal>
  );
}
