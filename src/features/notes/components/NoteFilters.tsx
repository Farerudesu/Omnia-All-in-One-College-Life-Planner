import { Search, Tag, GraduationCap, Pin, Archive, X } from 'lucide-react';
import type { NoteFilter, Course } from '@/types';
import { useLanguage } from '@/lib/useLanguage';
import { translations } from '@/lib/i18n';

interface NoteFiltersProps {
  filter?: NoteFilter;
  availableTags: string[];
  courses: Course[];
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onFilterChange: (patch: Partial<NoteFilter>) => void;
  onClearFilters: () => void;
}

export function NoteFilters({
  filter,
  availableTags,
  courses,
  searchQuery,
  onSearchChange,
  onFilterChange,
  onClearFilters,
}: NoteFiltersProps) {
  const lang = useLanguage();
  const t = translations[lang].notes;

  const isArchived = filter?.isArchived === true;
  const isPinned = filter?.isPinned === true;
  const activeCourseId = filter?.courseId;
  const activeTag = filter?.tag;

  const hasActiveFilters = Boolean(
    searchQuery.trim() || isArchived || isPinned || activeCourseId || activeTag
  );

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '0.625rem',
        padding: '0.75rem',
        borderBottom: '1px solid var(--outline-variant)',
        background: 'var(--surface-container-lowest)',
      }}
    >
      {/* Search Input Bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          padding: '0.4375rem 0.625rem',
          borderRadius: 'var(--radius-md)',
          background: 'var(--surface-container)',
          border: '1px solid var(--outline-variant)',
        }}
      >
        <Search size={16} color="var(--on-surface-variant)" aria-hidden="true" style={{ flexShrink: 0 }} />
        <input
          type="search"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder={t.searchPlaceholder}
          aria-label={t.searchPlaceholder}
          style={{
            flex: 1,
            border: 'none',
            background: 'transparent',
            outline: 'none',
            fontSize: '0.875rem',
            color: 'var(--on-surface)',
          }}
        />
        {searchQuery && (
          <button
            type="button"
            className="btn-ghost"
            style={{ padding: '0.125rem 0.25rem', height: 'auto' }}
            onClick={() => onSearchChange('')}
            aria-label="Clear search"
          >
            <X size={14} />
          </button>
        )}
      </div>

      {/* Filter Row: Course, Pin, Archive, Reset */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.375rem',
          flexWrap: 'wrap',
        }}
      >
        {/* Course Filter Dropdown */}
        <div style={{ display: 'flex', alignItems: 'center', position: 'relative' }}>
          <select
            value={activeCourseId || ''}
            onChange={(e) => onFilterChange({ courseId: e.target.value || undefined })}
            aria-label={lang === 'id' ? 'Filter mata kuliah' : 'Filter by course'}
            style={{
              padding: '0.3125rem 0.5rem 0.3125rem 1.625rem',
              borderRadius: 'var(--radius-sm)',
              fontSize: '0.75rem',
              fontWeight: 500,
              border: activeCourseId ? '1px solid var(--primary)' : '1px solid var(--outline-variant)',
              background: activeCourseId ? 'var(--primary-container)' : 'var(--surface-container-low)',
              color: activeCourseId ? 'var(--on-primary-container)' : 'var(--on-surface-variant)',
            }}
          >
            <option value="">{lang === 'id' ? 'Semua Kuliah' : 'All Courses'}</option>
            {courses.map((c) => (
              <option key={c.id} value={c.id}>
                {c.code}
              </option>
            ))}
          </select>
          <GraduationCap
            size={13}
            style={{
              position: 'absolute',
              left: 6,
              pointerEvents: 'none',
              color: activeCourseId ? 'var(--primary)' : 'var(--on-surface-variant)',
            }}
            aria-hidden="true"
          />
        </div>

        {/* Pinned Filter Pill */}
        <button
          type="button"
          onClick={() => onFilterChange({ isPinned: isPinned ? undefined : true })}
          className="btn-ghost"
          style={{
            padding: '0.3125rem 0.5rem',
            fontSize: '0.75rem',
            borderRadius: 'var(--radius-sm)',
            border: isPinned ? '1px solid var(--primary)' : '1px solid var(--outline-variant)',
            background: isPinned ? 'var(--primary-container)' : 'var(--surface-container-low)',
            color: isPinned ? 'var(--primary)' : 'var(--on-surface-variant)',
            fontWeight: isPinned ? 600 : 500,
            gap: '0.25rem',
          }}
          aria-pressed={isPinned}
        >
          <Pin size={12} fill={isPinned ? 'currentColor' : 'none'} />
          <span>{t.pinned}</span>
        </button>

        {/* Archived Filter Pill */}
        <button
          type="button"
          onClick={() => onFilterChange({ isArchived: isArchived ? undefined : true })}
          className="btn-ghost"
          style={{
            padding: '0.3125rem 0.5rem',
            fontSize: '0.75rem',
            borderRadius: 'var(--radius-sm)',
            border: isArchived ? '1px solid var(--primary)' : '1px solid var(--outline-variant)',
            background: isArchived ? 'var(--primary-container)' : 'var(--surface-container-low)',
            color: isArchived ? 'var(--primary)' : 'var(--on-surface-variant)',
            fontWeight: isArchived ? 600 : 500,
            gap: '0.25rem',
          }}
          aria-pressed={isArchived}
        >
          <Archive size={12} />
          <span>{t.archived}</span>
        </button>

        {/* Clear all active filters */}
        {hasActiveFilters && (
          <button
            type="button"
            className="btn-ghost"
            onClick={onClearFilters}
            style={{
              padding: '0.3125rem 0.5rem',
              fontSize: '0.75rem',
              color: 'var(--error)',
              gap: '0.25rem',
              marginLeft: 'auto',
            }}
          >
            <X size={12} />
            <span>{lang === 'id' ? 'Reset' : 'Clear'}</span>
          </button>
        )}
      </div>

      {/* Tag pills (horizontal scrollable) */}
      {availableTags.length > 0 && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.375rem',
            overflowX: 'auto',
            paddingBottom: '0.125rem',
            scrollbarWidth: 'none',
          }}
        >
          <Tag size={13} color="var(--on-surface-variant)" aria-hidden="true" style={{ flexShrink: 0 }} />
          {availableTags.map((tag) => {
            const isTagActive = activeTag === tag;
            return (
              <button
                key={tag}
                type="button"
                onClick={() => onFilterChange({ tag: isTagActive ? undefined : tag })}
                style={{
                  flexShrink: 0,
                  fontSize: '0.6875rem',
                  padding: '0.1875rem 0.5rem',
                  borderRadius: 999,
                  border: isTagActive ? '1px solid var(--primary)' : '1px solid var(--outline-variant)',
                  background: isTagActive ? 'var(--primary)' : 'var(--surface-container-low)',
                  color: isTagActive ? 'var(--on-primary)' : 'var(--on-surface-variant)',
                  cursor: 'pointer',
                  fontWeight: isTagActive ? 600 : 500,
                  transition: 'all 0.15s ease',
                }}
              >
                #{tag}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
