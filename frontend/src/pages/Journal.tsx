// SPDX-License-Identifier: AGPL-3.0-or-later
import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../api/client';
import type { JournalDraft } from '../api/client';
import { formatDate, parseDate, today, isToday } from '../lib/date-utils';
import { PASTILLE_IDS, PASTILLE_GLYPHS } from '../constants/phase-meta';
import type { PastilleId } from '../constants/phase-meta';
import Pastille from '../components/ui/Pastille';
import { useToast } from '../components/ui/Toast';

const EMPTY: JournalDraft = { pastilles: [], free_text: null, helpful: null, not_helpful: null };

/** Whitespace-only text is nothing: keep it out of the entry (and of the échos). */
const trimmed = (value: string | null): string | null => value?.trim() || null;

const normalize = (draft: JournalDraft): JournalDraft => ({
  pastilles: draft.pastilles,
  free_text: trimmed(draft.free_text),
  helpful: trimmed(draft.helpful),
  not_helpful: trimmed(draft.not_helpful),
});

const fieldClass =
  'w-full resize-none rounded-[14px] border border-warm-300 bg-warm-100 px-3.5 py-3 text-[15px] leading-relaxed text-ink outline-none transition-colors focus:border-ink';

/** Validates a ?date=YYYY-MM-DD param: a real day, not in the future. */
function initialDate(param: string | null): Date {
  if (!param || !/^\d{4}-\d{2}-\d{2}$/.test(param)) return today();
  const d = parseDate(param);
  return Number.isNaN(d.getTime()) || d > today() ? today() : d;
}

export default function Journal() {
  const { t, i18n } = useTranslation('journal');
  const { t: tCommon } = useTranslation('common');
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { showToast } = useToast();

  const [selectedDate, setSelectedDate] = useState<Date>(() => initialDate(searchParams.get('date')));
  const [draft, setDraft] = useState<JournalDraft>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [definition, setDefinition] = useState<PastilleId | null>(null);

  useEffect(() => {
    let active = true;
    setDraft(EMPTY);
    api.journal.get(formatDate(selectedDate))
      .then((e) => {
        if (!active) return;
        setDraft({
          pastilles: e.pastilles,
          free_text: e.free_text,
          helpful: e.helpful,
          not_helpful: e.not_helpful,
        });
      })
      .catch(() => {});
    return () => { active = false; };
  }, [selectedDate]);

  const togglePastille = (id: string) =>
    setDraft((prev) => ({
      ...prev,
      pastilles: prev.pastilles.includes(id)
        ? prev.pastilles.filter((x) => x !== id)
        : [...prev.pastilles, id],
    }));

  const save = async () => {
    setSaving(true);
    const clean = normalize(draft);
    try {
      await api.journal.upsert(formatDate(selectedDate), clean);
      setDraft(clean);
      setSaved(true);
    } catch {
      showToast(tCommon('error'), 'error');
    } finally {
      setSaving(false);
    }
  };

  const close = () => (window.history.length > 1 ? navigate(-1) : navigate('/'));
  const atToday = isToday(selectedDate);
  const dateLabel = atToday
    ? tCommon('dates.today').toLowerCase()
    : new Intl.DateTimeFormat(i18n.language, { weekday: 'long', day: 'numeric', month: 'long' }).format(selectedDate);
  const count = draft.pastilles.length;

  if (saved) {
    return (
      <div className="flex min-h-screen flex-col bg-warm-50 px-6 pb-8 pt-16">
        <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
          <span className="flex h-[72px] w-[72px] items-center justify-center rounded-full bg-ink">
            <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" className="text-warm-50" aria-hidden="true">
              <path d="M4 12l5 5L20 6" />
            </svg>
          </span>
          <h1 className="text-[24px] font-bold text-ink">{t('note.saved_title')}</h1>
          <p className="max-w-[18rem] text-[15px] leading-relaxed text-ink-soft">{t('note.saved_body')}</p>
        </div>
        <div className="flex flex-col gap-2">
          <button
            type="button"
            onClick={() => navigate('/')}
            className="min-h-[54px] rounded-[14px] bg-ink text-[16px] font-bold text-warm-50"
          >
            {t('note.back_home')}
          </button>
          <button
            type="button"
            onClick={() => setSaved(false)}
            className="min-h-[44px] rounded-[14px] text-[14px] text-ink-soft"
          >
            {t('note.edit_again')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-warm-50">
      <div className="flex flex-1 flex-col gap-5 px-5 pb-40 pt-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex flex-col gap-2">
            <h1 className="text-[26px] font-bold leading-tight tracking-tight text-ink">{t('note.title')}</h1>
            <label className="relative inline-flex min-h-[36px] cursor-pointer items-center gap-2 self-start rounded-full border border-warm-300 bg-warm-100 px-3 text-[13px] text-ink">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M4 6h16v14H4zM4 10h16M8 3v4M16 3v4" />
              </svg>
              <span>{t('note.for_date', { date: dateLabel })} · <strong>{t('note.change')}</strong></span>
              <input
                type="date"
                value={formatDate(selectedDate)}
                max={formatDate(today())}
                onChange={(e) => e.target.value && setSelectedDate(parseDate(e.target.value))}
                className="absolute inset-0 cursor-pointer opacity-0"
                aria-label={t('note.choose_date')}
              />
            </label>
          </div>
          <button
            type="button"
            onClick={close}
            aria-label={tCommon('actions.close')}
            className="flex h-11 w-11 flex-none items-center justify-center rounded-full border border-warm-300 bg-warm-100 text-ink"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" aria-hidden="true">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>

        <p className="text-[13.5px] leading-snug text-warm-500">{t('full.disclaimer')}</p>

        <div>
          <div className="mb-2.5 flex items-baseline justify-between gap-2">
            <div className="text-[13px] font-medium text-ink-soft">{t('note.moments')}</div>
            <div className="text-[11px] text-warm-500">{t('note.long_press')}</div>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {PASTILLE_IDS.map((id) => (
              <Pastille
                key={id}
                glyph={PASTILLE_GLYPHS[id]}
                label={t(`pastilles.${id}`)}
                selected={draft.pastilles.includes(id)}
                onToggle={() => togglePastille(id)}
                onLongPress={() => setDefinition(id)}
              />
            ))}
          </div>
          {definition && (
            <div role="status" className="mt-2.5 flex items-start gap-3 rounded-[14px] border border-warm-300 bg-warm-100 px-3.5 py-2.5">
              <p className="flex-1 text-[13px] leading-snug text-ink-soft">
                <strong className="text-ink">{t(`pastilles.${definition}`)}</strong> — {t(`definitions.${definition}`)}
              </p>
              <button type="button" onClick={() => setDefinition(null)} aria-label={tCommon('actions.close')} className="min-h-[24px] text-warm-500">×</button>
            </div>
          )}
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="note-helped" className="text-[13px] font-medium" style={{ color: 'var(--color-success)' }}>
            {t('note.helped_label')}
          </label>
          <textarea
            id="note-helped"
            rows={2}
            aria-describedby="note-helped-hint"
            value={draft.helpful ?? ''}
            onChange={(e) => setDraft((p) => ({ ...p, helpful: e.target.value || null }))}
            className={fieldClass}
          />
          <div id="note-helped-hint" className="text-[12px] text-warm-500">{t('note.helped_hint')}</div>
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="note-not-helped" className="text-[13px] font-medium" style={{ color: 'var(--color-danger)' }}>
            {t('note.not_helped_label')}
          </label>
          <textarea
            id="note-not-helped"
            rows={2}
            aria-describedby="note-not-helped-hint"
            value={draft.not_helpful ?? ''}
            onChange={(e) => setDraft((p) => ({ ...p, not_helpful: e.target.value || null }))}
            className={fieldClass}
          />
          <div id="note-not-helped-hint" className="text-[12px] text-warm-500">{t('note.not_helped_hint')}</div>
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="note-free" className="text-[13px] font-medium text-ink-soft">
            {t('note.free_label')} <span className="font-normal text-warm-500">{t('note.optional')}</span>
          </label>
          <textarea
            id="note-free"
            rows={4}
            aria-describedby="note-free-hint"
            value={draft.free_text ?? ''}
            onChange={(e) => setDraft((p) => ({ ...p, free_text: e.target.value || null }))}
            className={fieldClass}
          />
          <div id="note-free-hint" className="text-[12px] text-warm-500">{t('note.free_hint')}</div>
        </div>
      </div>

      <div
        className="safe-bottom fixed bottom-0 left-0 right-0 flex flex-col gap-2 px-5 pt-3"
        style={{ background: 'linear-gradient(to top, var(--color-warm-50) 75%, transparent)' }}
      >
        <div className="mx-auto flex w-full max-w-md items-start gap-2 text-[12px] leading-snug text-warm-500">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="flex-none">
            <path d="M5 11h14v10H5zM8 11V7a4 4 0 0 1 8 0v4" />
          </svg>
          <span>{t('note.no_ai')}</span>
        </div>
        <button
          type="button"
          onClick={save}
          disabled={saving}
          className="mx-auto min-h-[54px] w-full max-w-md rounded-[14px] bg-ink text-[16px] font-bold text-warm-50 transition-all active:scale-[0.99] disabled:opacity-50"
        >
          {t('note.save')}{count > 0 ? ` · ${t('note.pastilles_count', { count })}` : ''}
        </button>
      </div>
    </div>
  );
}
