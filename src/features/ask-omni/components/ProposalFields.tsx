import { EXPENSE_CATEGORIES } from '@/lib/categories';
import type { Language } from '@/lib/i18n';
import type { Course, EventType, Priority, PrefilledData } from '@/types';

interface ProposalFieldsProps {
  data: PrefilledData;
  courses: Course[];
  paymentMethods: string[];
  lang: Language;
  onChangeData: (updater: (prev: PrefilledData) => PrefilledData) => void;
}

export function ProposalFields({
  data,
  courses,
  paymentMethods,
  lang,
  onChangeData,
}: ProposalFieldsProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
      {/* Title */}
      <div>
        <label
          style={{
            display: 'block',
            fontSize: '0.8125rem',
            fontWeight: 600,
            color: 'var(--on-surface)',
            marginBottom: '0.25rem',
          }}
        >
          {data.type === 'expense' ? 'Description / Merchant *' : 'Title *'}
        </label>
        <input
          type="text"
          value={data.title}
          onChange={(e) => onChangeData((prev) => ({ ...prev, title: e.target.value }))}
          placeholder={data.type === 'expense' ? 'e.g. Lunch at Cafe' : 'e.g. CS101 Midterm Exam'}
          style={{ width: '100%', boxSizing: 'border-box' }}
        />
      </div>

      {/* Date & Time Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.75rem' }}>
        <div>
          <label
            style={{
              display: 'block',
              fontSize: '0.8125rem',
              fontWeight: 600,
              color: 'var(--on-surface)',
              marginBottom: '0.25rem',
            }}
          >
            Date *
          </label>
          <input
            type="date"
            value={data.date}
            onChange={(e) => onChangeData((prev) => ({ ...prev, date: e.target.value }))}
            style={{ width: '100%', boxSizing: 'border-box' }}
          />
        </div>

        {data.type === 'expense' ? (
          <div>
            <label
              style={{
                display: 'block',
                fontSize: '0.8125rem',
                fontWeight: 600,
                color: 'var(--on-surface)',
                marginBottom: '0.25rem',
              }}
            >
              {lang === 'id' ? 'Nominal (Rp) *' : 'Amount (Rp) *'}
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={data.amount ?? ''}
              onChange={(e) => {
                const val = parseFloat(e.target.value);
                onChangeData((prev) => ({ ...prev, amount: isNaN(val) ? 0 : val }));
              }}
              placeholder="0.00"
              style={{ width: '100%', boxSizing: 'border-box' }}
            />
          </div>
        ) : data.type === 'task' ? (
          <div>
            <label
              style={{
                display: 'block',
                fontSize: '0.8125rem',
                fontWeight: 600,
                color: 'var(--on-surface)',
                marginBottom: '0.25rem',
              }}
            >
              Due Time
            </label>
            <input
              type="time"
              value={data.dueTime || data.startTime || '23:59'}
              onChange={(e) => onChangeData((prev) => ({ ...prev, dueTime: e.target.value }))}
              style={{ width: '100%', boxSizing: 'border-box' }}
            />
          </div>
        ) : (
          <div>
            <label
              style={{
                display: 'block',
                fontSize: '0.8125rem',
                fontWeight: 600,
                color: 'var(--on-surface)',
                marginBottom: '0.25rem',
              }}
            >
              Start Time
            </label>
            <input
              type="time"
              value={data.startTime || ''}
              onChange={(e) => onChangeData((prev) => ({ ...prev, startTime: e.target.value }))}
              style={{ width: '100%', boxSizing: 'border-box' }}
            />
          </div>
        )}
      </div>

      {/* Event Specific: End Time & Location */}
      {data.type === 'event' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.75rem' }}>
          <div>
            <label
              style={{
                display: 'block',
                fontSize: '0.8125rem',
                fontWeight: 600,
                color: 'var(--on-surface)',
                marginBottom: '0.25rem',
              }}
            >
              End Time
            </label>
            <input
              type="time"
              value={data.endTime || ''}
              onChange={(e) => onChangeData((prev) => ({ ...prev, endTime: e.target.value }))}
              style={{ width: '100%', boxSizing: 'border-box' }}
            />
          </div>
          <div>
            <label
              style={{
                display: 'block',
                fontSize: '0.8125rem',
                fontWeight: 600,
                color: 'var(--on-surface)',
                marginBottom: '0.25rem',
              }}
            >
              Location
            </label>
            <input
              type="text"
              placeholder="e.g. Hall B302, Library"
              value={data.location || ''}
              onChange={(e) => onChangeData((prev) => ({ ...prev, location: e.target.value }))}
              style={{ width: '100%', boxSizing: 'border-box' }}
            />
          </div>
        </div>
      )}

      {/* Task / Expense Course or Category Selection */}
      {data.type === 'task' ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.75rem' }}>
          <div>
            <label
              style={{
                display: 'block',
                fontSize: '0.8125rem',
                fontWeight: 600,
                color: 'var(--on-surface)',
                marginBottom: '0.25rem',
              }}
            >
              Course (Optional)
            </label>
            <select
              value={data.courseId || ''}
              onChange={(e) => onChangeData((prev) => ({ ...prev, courseId: e.target.value || undefined }))}
              style={{ width: '100%', boxSizing: 'border-box' }}
            >
              <option value="">General (No Course)</option>
              {courses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.code} – {c.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label
              style={{
                display: 'block',
                fontSize: '0.8125rem',
                fontWeight: 600,
                color: 'var(--on-surface)',
                marginBottom: '0.25rem',
              }}
            >
              Priority
            </label>
            <select
              value={data.priority || 'medium'}
              onChange={(e) => onChangeData((prev) => ({ ...prev, priority: e.target.value as Priority }))}
              style={{ width: '100%', boxSizing: 'border-box' }}
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
          </div>
        </div>
      ) : data.type === 'expense' ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.75rem' }}>
          <div>
            <label
              style={{
                display: 'block',
                fontSize: '0.8125rem',
                fontWeight: 600,
                color: 'var(--on-surface)',
                marginBottom: '0.25rem',
              }}
            >
              Category
            </label>
            <select
              value={data.category || 'Food & Groceries'}
              onChange={(e) =>
                onChangeData((prev) => ({ ...prev, category: e.target.value as PrefilledData['category'] }))
              }
              style={{ width: '100%', boxSizing: 'border-box' }}
            >
              {EXPENSE_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label
              style={{
                display: 'block',
                fontSize: '0.8125rem',
                fontWeight: 600,
                color: 'var(--on-surface)',
                marginBottom: '0.25rem',
              }}
            >
              {lang === 'id' ? 'Metode Pembayaran' : 'Payment Method'}
            </label>
            <select
              value={data.paymentMethod || 'QRIS'}
              onChange={(e) => onChangeData((prev) => ({ ...prev, paymentMethod: e.target.value }))}
              style={{ width: '100%', boxSizing: 'border-box' }}
            >
              {paymentMethods.map((pm) => (
                <option key={pm} value={pm}>
                  {pm}
                </option>
              ))}
            </select>
          </div>
        </div>
      ) : (
        <div>
          <label
            style={{
              display: 'block',
              fontSize: '0.8125rem',
              fontWeight: 600,
              color: 'var(--on-surface)',
              marginBottom: '0.25rem',
            }}
          >
            Event Type
          </label>
          <select
            value={data.eventType || 'personal'}
            onChange={(e) => onChangeData((prev) => ({ ...prev, eventType: e.target.value as EventType }))}
            style={{ width: '100%', boxSizing: 'border-box' }}
          >
            <option value="personal">Personal</option>
            <option value="exam">Exam</option>
            <option value="deadline">Deadline</option>
            <option value="class">Class</option>
          </select>
        </div>
      )}

      {/* Notes */}
      <div>
        <label
          style={{
            display: 'block',
            fontSize: '0.8125rem',
            fontWeight: 600,
            color: 'var(--on-surface)',
            marginBottom: '0.25rem',
          }}
        >
          Notes (Optional)
        </label>
        <textarea
          rows={2}
          value={data.notes || ''}
          onChange={(e) => onChangeData((prev) => ({ ...prev, notes: e.target.value }))}
          placeholder="Additional information..."
          style={{ width: '100%', boxSizing: 'border-box', resize: 'vertical' }}
        />
      </div>
    </div>
  );
}
