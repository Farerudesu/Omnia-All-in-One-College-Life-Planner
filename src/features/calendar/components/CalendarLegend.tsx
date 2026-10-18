import { formatDateLong } from '@/lib/dateUtils';
import { CategoryIndicator } from '@/components/CategoryIndicator';
import { LEGEND_ITEMS } from '../utils/calendarUtils';
import type { ViewMode } from '../types';

interface CalendarLegendProps {
  lang: 'id' | 'en';
  viewMode: ViewMode;
  selectedDate: Date | null;
  weekStartDate?: Date;
  filters: Record<string, boolean>;
  toggleFilter: (key: string) => void;
}

export function CalendarLegend({
  lang,
  viewMode,
  selectedDate,
  weekStartDate,
  filters,
  toggleFilter,
}: CalendarLegendProps) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '1.25rem',
        flexWrap: 'wrap',
        gap: '0.75rem',
      }}
    >
      <div>
        <h1 style={{ fontSize: 'clamp(1.25rem, 4vw, 1.75rem)', fontWeight: 700, margin: 0 }}>
          {viewMode === 'Month' && (lang === 'id' ? 'Kalender Akademik' : 'Academic Calendar')}
          {viewMode === 'Week' && (lang === 'id' ? `Jadwal Mingguan (${weekStartDate ? formatDateLong(weekStartDate) : ''})` : `Weekly Overview (${weekStartDate ? formatDateLong(weekStartDate) : ''})`)}
          {viewMode === 'Day' && (selectedDate ? formatDateLong(selectedDate) : (lang === 'id' ? 'Kegiatan Hari Ini' : 'Today’s Schedule'))}
          {viewMode === 'Agenda' && (lang === 'id' ? 'Linimasa & Tenggat Mendatang' : 'Upcoming Timeline & Deadlines')}
        </h1>
      </div>

      <div
        className="calendar-legend-chips"
        style={{
          display: 'flex',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '0.5rem',
          paddingBottom: '0.25rem',
        }}
      >
        {LEGEND_ITEMS.map((item) => {
          const isActive = Boolean(filters[item.key]);
          return (
            <button
              key={item.key}
              type="button"
              onClick={() => toggleFilter(item.key)}
              className="min-touch-target"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.375rem',
                fontSize: '0.8125rem',
                fontWeight: 600,
                minHeight: 44,
                padding: '0.375rem 0.75rem',
                borderRadius: 20,
                border: isActive
                  ? '1px solid var(--outline-variant)'
                  : '1px solid transparent',
                background: isActive
                  ? 'var(--surface-container-low)'
                  : 'transparent',
                color: isActive ? 'var(--on-surface)' : 'var(--outline)',
                opacity: isActive ? 1 : 0.55,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                transition: 'all 0.15s ease',
              }}
              title={lang === 'id' ? `Filter: ${item.labelId}` : `Filter: ${item.labelEn}`}
            >
              <CategoryIndicator shape={item.shape} color={item.color} size={8} />
              <span>{lang === 'id' ? item.labelId : item.labelEn}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
