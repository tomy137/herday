// SPDX-License-Identifier: AGPL-3.0-or-later
import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import type { JournalDraft } from '../api/client';
import { formatDate, parseDate, today, addDays, isToday } from '../lib/date-utils';
import { PASTILLE_IDS, PASTILLE_GLYPHS } from '../constants/phase-meta';
import Pastille from '../components/ui/Pastille';
import { useToast } from '../components/ui/Toast';

const EMPTY: JournalDraft = { pastilles: [], free_text: null, helpful: null, not_helpful: null };

export default function Journal() {
  const { t, i18n } = useTranslation('journal');
  const { t: tCommon } = useTranslation('common');
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [selectedDate, setSelectedDate] = useState<Date>(today());
  const [draft, setDraft] = useState<JournalDraft>(EMPTY);
  const [saving, setSaving] = useState(false);

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
    try {
      await api.journal.upsert(formatDate(selectedDate), draft);
      showToast(t('quick.saved'));
    } catch {
      showToast(tCommon('error'), 'error');
    } finally {
      setSaving(false);
    }
  };

  const dateMeta = new Intl.DateTimeFormat(i18n.language, { weekday: 'short', day: 'numeric', month: 'short' })
    .format(selectedDate)
    .replace(/\./g, '')
    .toUpperCase();
  const atToday = isToday(selectedDate);

  return (
    <div className="min-h-screen bg-warm-50">
      {/* Header: back · day stepper · save */}
      <div className="flex items-center justify-between px-[22px] pt-3.5">
        <button type="button" onClick={() => navigate(-1)} className="-ml-2 px-2 py-1.5 text-warm-500">
          ←
        </button>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setSelectedDate((d) => addDays(d, -1))}
            className="px-1.5 py-1 text-warm-400 hover:text-ink"
            aria-label="jour précédent"
          >
            ‹
          </button>
          <label className="relative cursor-pointer px-1">
            <span className="hd-meta text-warm-500">{dateMeta}</span>
            <input
              type="date"
              value={formatDate(selectedDate)}
              max={formatDate(today())}
              onChange={(e) => e.target.value && setSelectedDate(parseDate(e.target.value))}
              className="absolute inset-0 cursor-pointer opacity-0"
              aria-label="choisir une date"
            />
          </label>
          <button
            type="button"
            onClick={() => setSelectedDate((d) => addDays(d, 1))}
            disabled={atToday}
            className="px-1.5 py-1 text-warm-400 hover:text-ink disabled:opacity-30"
            aria-label="jour suivant"
          >
            ›
          </button>
        </div>
        <button
          type="button"
          onClick={save}
          disabled={saving}
          className="px-2 py-1.5 text-[12px] font-medium text-ink disabled:opacity-40"
        >
          {t('full.save')}
        </button>
      </div>

      <div className="flex flex-col gap-[22px] px-[22px] pb-12 pt-5">
        <div>
          <div className="hd-caps mb-2.5 text-warm-400">{t('full.eyebrow')}</div>
          <h1 className="text-[28px] font-bold leading-tight tracking-tight text-ink">
            {atToday ? t('full.title') : `${dateMeta}`}
          </h1>
          <p className="mt-2.5 text-[13.5px] leading-snug text-warm-500">{t('full.disclaimer')}</p>
        </div>

        <div>
          <div className="hd-caps mb-2.5 text-warm-500">{t('full.moments')}</div>
          <div className="flex flex-wrap gap-1.5">
            {PASTILLE_IDS.map((id) => (
              <Pastille
                key={id}
                glyph={PASTILLE_GLYPHS[id]}
                label={t(`pastilles.${id}`)}
                selected={draft.pastilles.includes(id)}
                onToggle={() => togglePastille(id)}
              />
            ))}
          </div>
        </div>

        <div>
          <div className="hd-caps mb-2.5 text-warm-500">{t('full.free_label')}</div>
          <textarea
            rows={6}
            placeholder={t('full.free_placeholder')}
            value={draft.free_text ?? ''}
            onChange={(e) => setDraft((p) => ({ ...p, free_text: e.target.value || null }))}
            className="w-full resize-none rounded-[10px] border-[0.5px] border-warm-300 bg-warm-100 px-3.5 py-3 text-[14px] leading-relaxed text-ink outline-none transition-colors focus:border-ink focus:bg-warm-50"
          />
        </div>

        <div>
          <div className="hd-caps mb-2.5 text-warm-500">{t('full.loop_label')}</div>
          <p className="mb-3.5 text-[12.5px] leading-snug text-warm-500">{t('full.loop_hint')}</p>
          <div className="flex flex-col gap-4">
            <div>
              <label className="hd-caps mb-1.5 block" style={{ color: 'var(--color-phase-pre-ovulatory)' }}>
                {t('full.helped_label')}
              </label>
              <textarea
                rows={2}
                placeholder={t('full.helped_placeholder')}
                value={draft.helpful ?? ''}
                onChange={(e) => setDraft((p) => ({ ...p, helpful: e.target.value || null }))}
                className="w-full resize-none rounded-[10px] border-[0.5px] border-warm-300 bg-warm-100 px-3.5 py-3 text-[14px] leading-relaxed text-ink outline-none transition-colors focus:border-ink focus:bg-warm-50"
              />
            </div>
            <div>
              <label className="hd-caps mb-1.5 block" style={{ color: 'var(--color-phase-menstruation)' }}>
                {t('full.not_helped_label')}
              </label>
              <textarea
                rows={2}
                placeholder={t('full.not_helped_placeholder')}
                value={draft.not_helpful ?? ''}
                onChange={(e) => setDraft((p) => ({ ...p, not_helpful: e.target.value || null }))}
                className="w-full resize-none rounded-[10px] border-[0.5px] border-warm-300 bg-warm-100 px-3.5 py-3 text-[14px] leading-relaxed text-ink outline-none transition-colors focus:border-ink focus:bg-warm-50"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
