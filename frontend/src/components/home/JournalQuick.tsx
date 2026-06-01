// SPDX-License-Identifier: AGPL-3.0-or-later
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { JournalDraft } from '../../api/client';
import { PASTILLE_IDS, PASTILLE_GLYPHS } from '../../constants/phase-meta';
import Pastille from '../ui/Pastille';

interface JournalQuickProps {
  initial: JournalDraft;
  onSave: (draft: JournalDraft) => void;
  onWriteMore?: () => void;
}

const SAVE_DEBOUNCE_MS = 800;

/** Inline daily observation on the home screen. Saves debounced. */
export default function JournalQuick({ initial, onSave, onWriteMore }: JournalQuickProps) {
  const { t } = useTranslation('journal');
  const [draft, setDraft] = useState<JournalDraft>(initial);
  const timer = useRef<number | undefined>(undefined);
  const latest = useRef(draft);
  latest.current = draft;

  const scheduleSave = (next: JournalDraft) => {
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => onSave(next), SAVE_DEBOUNCE_MS);
  };

  // Flush any pending save on unmount.
  useEffect(() => () => {
    if (timer.current) {
      window.clearTimeout(timer.current);
      onSave(latest.current);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setField = (patch: Partial<JournalDraft>) =>
    setDraft((prev) => {
      const next = { ...prev, ...patch };
      scheduleSave(next);
      return next;
    });

  const togglePastille = (id: string) =>
    setDraft((prev) => {
      const has = prev.pastilles.includes(id);
      const next = {
        ...prev,
        pastilles: has ? prev.pastilles.filter((x) => x !== id) : [...prev.pastilles, id],
      };
      scheduleSave(next);
      return next;
    });

  return (
    <div className="hd-card">
      <div className="mb-3 flex items-center justify-between">
        <span className="hd-caps text-warm-500">{t('quick.title')}</span>
        <span className="hd-meta text-warm-400">{t('quick.duration')}</span>
      </div>

      <div className="mb-3.5 flex flex-wrap gap-1.5">
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

      <textarea
        rows={2}
        placeholder={t('quick.free_placeholder')}
        value={draft.free_text ?? ''}
        onChange={(e) => setField({ free_text: e.target.value || null })}
        className="w-full resize-none rounded-[10px] border-[0.5px] border-warm-300 bg-warm-100 px-3.5 py-3 text-[14px] leading-relaxed text-ink outline-none transition-colors focus:border-ink focus:bg-warm-50"
      />

      <div className="mt-2.5 grid grid-cols-2 gap-2">
        <div>
          <label className="hd-caps mb-1 block" style={{ color: 'var(--color-phase-pre-ovulatory)' }}>
            {t('quick.helped')}
          </label>
          <input
            placeholder={t('quick.helped_placeholder')}
            value={draft.helpful ?? ''}
            onChange={(e) => setField({ helpful: e.target.value || null })}
            className="w-full border-0 border-b-[0.5px] border-warm-300 bg-transparent py-2 text-[14px] text-ink outline-none transition-colors focus:border-ink"
          />
        </div>
        <div>
          <label className="hd-caps mb-1 block" style={{ color: 'var(--color-phase-menstruation)' }}>
            {t('quick.not_helped')}
          </label>
          <input
            placeholder={t('quick.not_helped_placeholder')}
            value={draft.not_helpful ?? ''}
            onChange={(e) => setField({ not_helpful: e.target.value || null })}
            className="w-full border-0 border-b-[0.5px] border-warm-300 bg-transparent py-2 text-[14px] text-ink outline-none transition-colors focus:border-ink"
          />
        </div>
      </div>

      {onWriteMore && (
        <button
          type="button"
          onClick={onWriteMore}
          className="mt-3 text-[12px] text-warm-500 transition-colors hover:text-ink"
        >
          {t('quick.write_more')} →
        </button>
      )}
    </div>
  );
}
