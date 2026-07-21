// SPDX-License-Identifier: AGPL-3.0-or-later
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { api } from '../../api/client';
import type { CalendarLabelsMode, CalendarSubscription } from '../../api/client';
import { useToast } from '../ui/Toast';
import SettingsGroup from './SettingsGroup';

const LABEL_MODES: CalendarLabelsMode[] = ['discreet', 'explicit'];

/** "Shared calendar": manage the living iCal subscription for her two key periods. */
export default function CalendarFeedSettings() {
  const { t } = useTranslation('settings');
  const { showToast } = useToast();
  const [sub, setSub] = useState<CalendarSubscription | null>(null);
  const [enoughData, setEnoughData] = useState(true);
  const [busy, setBusy] = useState(false);
  const [showRegen, setShowRegen] = useState(false);
  const [showHelp, setShowHelp] = useState(false);

  useEffect(() => {
    api.calendar.get().then(setSub).catch(() => {});
    api.phases
      .today()
      .then((p) => setEnoughData(p.system_state !== 'unknown'))
      .catch(() => {});
  }, []);

  const run = async (fn: () => Promise<CalendarSubscription>) => {
    setBusy(true);
    try {
      setSub(await fn());
    } catch {
      showToast(t('calendar_feed.error'), 'error');
    } finally {
      setBusy(false);
    }
  };

  const copy = async () => {
    if (!sub?.feed_url) return;
    try {
      await navigator.clipboard.writeText(sub.feed_url);
      showToast(t('calendar_feed.copied'));
    } catch {
      showToast(t('calendar_feed.error'), 'error');
    }
  };

  return (
    <SettingsGroup title={t('calendar_feed.group')}>
      <div className="flex flex-col gap-3 px-[18px] py-4">
        <p className="text-[13.5px] leading-relaxed text-ink-soft">{t('calendar_feed.body')}</p>

        {!enoughData && (
          <p className="text-[12.5px] leading-relaxed text-warm-500">
            {t('calendar_feed.not_enough_data')}
          </p>
        )}

        {!sub?.enabled ? (
          <button
            type="button"
            disabled={busy}
            onClick={() => run(api.calendar.enable)}
            className="rounded-[10px] bg-ink py-2.5 text-[13px] font-medium text-warm-50 disabled:opacity-50"
          >
            {t('calendar_feed.enable')}
          </button>
        ) : (
          <>
            {/* Label style */}
            <div>
              <div className="mb-2 text-[13px] text-ink">{t('calendar_feed.labels_label')}</div>
              <div className="flex gap-2">
                {LABEL_MODES.map((m) => (
                  <button
                    key={m}
                    type="button"
                    disabled={busy}
                    onClick={() => run(() => api.calendar.setLabels(m))}
                    className={`flex-1 rounded-[10px] py-2 text-[13px] font-medium transition-colors disabled:opacity-50 ${
                      sub.labels_mode === m
                        ? 'bg-ink text-warm-50'
                        : 'bg-warm-100 text-warm-500 hover:bg-warm-200'
                    }`}
                  >
                    {t(`calendar_feed.labels.${m}`)}
                  </button>
                ))}
              </div>
              <p className="mt-1.5 hd-meta text-warm-400">
                {t(`calendar_feed.labels_hint.${sub.labels_mode}`)}
              </p>
            </div>

            {/* Subscription URL */}
            <div>
              <div className="mb-1.5 text-[13px] text-ink">{t('calendar_feed.url_label')}</div>
              <div className="flex items-center gap-2">
                <input
                  readOnly
                  value={sub.feed_url ?? ''}
                  onFocus={(e) => e.currentTarget.select()}
                  className="min-w-0 flex-1 truncate rounded-[10px] bg-warm-100 px-3 py-2 text-[12px] text-warm-500"
                />
                <button
                  type="button"
                  onClick={copy}
                  className="shrink-0 rounded-[10px] bg-warm-100 px-3 py-2 text-[12px] font-medium text-ink hover:bg-warm-200"
                >
                  {t('calendar_feed.copy')}
                </button>
              </div>
            </div>

            {/* Subscribe (native calendar apps) */}
            {sub.webcal_url && (
              <a
                href={sub.webcal_url}
                className="rounded-[10px] bg-ink py-2.5 text-center text-[13px] font-medium text-warm-50"
              >
                {t('calendar_feed.subscribe')}
              </a>
            )}

            {/* Google Calendar help */}
            <button
              type="button"
              onClick={() => setShowHelp((v) => !v)}
              className="text-left text-[12.5px] font-medium text-warm-500 underline"
            >
              {t('calendar_feed.google_help_toggle')}
            </button>
            {showHelp && (
              <p className="whitespace-pre-line rounded-[10px] bg-warm-100 px-3 py-2.5 text-[12.5px] leading-relaxed text-ink-soft">
                {t('calendar_feed.google_help')}
              </p>
            )}

            <p className="hd-meta text-warm-400">{t('calendar_feed.refresh_notice')}</p>

            {/* Regenerate / disable */}
            {!showRegen ? (
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowRegen(true)}
                  className="flex-1 rounded-[10px] bg-warm-100 py-2 text-[12.5px] font-medium text-warm-500 hover:bg-warm-200"
                >
                  {t('calendar_feed.regenerate')}
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => run(api.calendar.disable)}
                  className="flex-1 rounded-[10px] bg-warm-100 py-2 text-[12.5px] font-medium text-warm-500 hover:bg-warm-200 disabled:opacity-50"
                >
                  {t('calendar_feed.disable')}
                </button>
              </div>
            ) : (
              <div className="rounded-[10px] bg-warm-100 px-3 py-3">
                <p className="mb-2.5 text-[12.5px] leading-relaxed text-ink-soft">
                  {t('calendar_feed.regenerate_confirm')}
                </p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setShowRegen(false)}
                    className="flex-1 rounded-[10px] bg-warm-50 py-2 text-[12.5px] font-medium text-warm-500"
                  >
                    {t('calendar_feed.cancel')}
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => {
                      setShowRegen(false);
                      run(api.calendar.rotate);
                    }}
                    className="flex-1 rounded-[10px] bg-ink py-2 text-[12.5px] font-medium text-warm-50 disabled:opacity-50"
                  >
                    {t('calendar_feed.regenerate_confirm_btn')}
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </SettingsGroup>
  );
}
