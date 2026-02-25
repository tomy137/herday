import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { api, ApiError } from '../api/client';

export default function Login() {
  const { t } = useTranslation('auth');
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || loading) return;

    setLoading(true);
    setError(null);
    try {
      await api.auth.sendMagicLink(email.trim());
      setSent(true);
    } catch (err) {
      if (err instanceof ApiError && err.status === 429) {
        setError(t('login.rate_limited'));
      } else {
        setError(t('common:error'));
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-warm-50 flex items-center justify-center p-5">
      <div className="w-full max-w-md animate-fade-in-up">
        <div className="text-center mb-10">
          <h1 className="text-4xl font-bold tracking-tight">
            <span className="bg-gradient-to-r from-[#DC3D5A] to-[#E8647D] bg-clip-text text-transparent">
              HerDay
            </span>
          </h1>
          <h2 className="mt-5 text-xl font-semibold text-gray-900 tracking-tight">{t('login.title')}</h2>
          <p className="mt-2 text-warm-500 text-[15px]">{t('login.subtitle')}</p>
        </div>

        {sent ? (
          <div className="bg-white rounded-3xl p-8 shadow-[0_2px_12px_rgba(0,0,0,0.06)] border border-warm-200/40 text-center animate-scale-in">
            <div className="w-16 h-16 rounded-full bg-[#2DA87E]/10 flex items-center justify-center mx-auto mb-5">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#2DA87E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 2L11 13" /><path d="M22 2L15 22L11 13L2 9L22 2Z" />
              </svg>
            </div>
            <p className="text-gray-900 font-semibold text-[15px]">{t('login.email_sent')}</p>
            <p className="mt-2 text-sm text-warm-400">{t('login.check_spam')}</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="bg-white rounded-3xl p-8 shadow-[0_2px_12px_rgba(0,0,0,0.06)] border border-warm-200/40">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t('login.email_placeholder')}
              required
              autoFocus
              className="w-full px-4 py-3.5 rounded-2xl border border-warm-200 bg-warm-50 focus:outline-none focus:ring-2 focus:ring-[#DC3D5A]/30 focus:border-[#DC3D5A]/40 text-gray-900 placeholder-warm-400 transition-all"
            />
            {error && (
              <p className="mt-3 text-sm text-[#DC3D5A] font-medium">{error}</p>
            )}
            <button
              type="submit"
              disabled={loading || !email.trim()}
              className="mt-5 w-full py-3.5 rounded-2xl bg-gradient-to-r from-[#DC3D5A] to-[#E8647D] text-white font-semibold shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 active:scale-[0.98]"
            >
              {loading ? t('common:loading') : t('login.submit')}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
