import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

export default function Info() {
  const { t } = useTranslation('info');
  const navigate = useNavigate();

  return (
    <div className="p-5 space-y-6">
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate(-1)}
          className="w-10 h-10 rounded-xl flex items-center justify-center hover:bg-warm-100 text-warm-400 transition-all duration-200 active:scale-95"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h1 className="text-xl font-bold text-gray-900 tracking-tight">{t('title')}</h1>
      </div>

      {/* Glossary */}
      <section className="bg-white rounded-2xl p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)] border border-warm-200/40 space-y-3">
        <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider">{t('glossary.title')}</h2>
        {(['cycle', 'menstruation', 'follicular', 'ovulation', 'luteal', 'pms', 'ogino'] as const).map((key) => (
          <div key={key}>
            <p className="text-sm font-semibold text-gray-800">{t(`glossary.${key}.term`)}</p>
            <p className="text-xs text-warm-500 leading-relaxed">{t(`glossary.${key}.def`)}</p>
          </div>
        ))}
      </section>

      {/* How phases are calculated */}
      <section className="bg-white rounded-2xl p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)] border border-warm-200/40 space-y-3">
        <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider">{t('phases.title')}</h2>
        <p className="text-xs text-warm-500 leading-relaxed">{t('phases.ogino')}</p>
        <div className="rounded-xl bg-warm-50 p-3">
          <p className="text-xs font-mono text-gray-700 text-center">{t('phases.formula')}</p>
        </div>
        <p className="text-xs text-warm-500 leading-relaxed">{t('phases.example')}</p>
        <div className="space-y-1.5">
          {(['menstruation', 'follicular', 'ovulation', 'luteal'] as const).map((p) => (
            <div key={p} className="flex justify-between items-center rounded-lg bg-warm-50 px-3 py-2">
              <span className="text-xs font-semibold text-gray-800">{t(`phases.breakdown.${p}.name`)}</span>
              <span className="text-xs text-warm-400">{t(`phases.breakdown.${p}.days`)}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Confidence */}
      <section className="bg-white rounded-2xl p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)] border border-warm-200/40 space-y-3">
        <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider">{t('confidence.title')}</h2>
        <div className="space-y-1.5">
          {(['unknown', 'estimating', 'partial', 'learning', 'confident'] as const).map((s) => (
            <div key={s} className="flex justify-between items-center rounded-lg bg-warm-50 px-3 py-2">
              <span className="text-xs font-semibold text-gray-800">{t(`confidence.states.${s}.label`)}</span>
              <span className="text-xs text-warm-400">{t(`confidence.states.${s}.condition`)}</span>
            </div>
          ))}
        </div>
        <p className="text-xs text-warm-500 leading-relaxed">{t('confidence.hint')}</p>
      </section>

      {/* Limitations */}
      <section className="bg-white rounded-2xl p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)] border border-warm-200/40 space-y-3">
        <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider">{t('limits.title')}</h2>
        {(['not_medical', 'mood_weak', 'irregular', 'improves'] as const).map((key) => (
          <div key={key} className="flex gap-2">
            <span className="text-xs shrink-0">⚠️</span>
            <p className="text-xs text-warm-500 leading-relaxed">{t(`limits.${key}`)}</p>
          </div>
        ))}
      </section>
    </div>
  );
}
