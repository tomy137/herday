import { useEffect, useRef, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';

export default function Verify() {
  const { t } = useTranslation('auth');
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { login } = useAuth();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const didVerify = useRef(false);

  useEffect(() => {
    if (didVerify.current) return;
    didVerify.current = true;

    const token = searchParams.get('token');
    const email = searchParams.get('email');

    if (!token || !email) {
      setStatus('error');
      return;
    }

    login(token, email)
      .then(() => {
        setStatus('success');
        setTimeout(() => navigate('/', { replace: true }), 1000);
      })
      .catch(() => {
        setStatus('error');
      });
  }, [searchParams, login, navigate]);

  return (
    <div className="min-h-screen bg-warm-50 flex items-center justify-center p-5">
      <div className="w-full max-w-md text-center">
        <h1 className="text-4xl font-bold tracking-tight mb-8">
          <span className="bg-gradient-to-r from-[#DC3D5A] to-[#E8647D] bg-clip-text text-transparent">
            HerDay
          </span>
        </h1>

        {status === 'loading' && (
          <div className="bg-white rounded-3xl p-8 shadow-[0_2px_12px_rgba(0,0,0,0.06)] border border-warm-200/40 animate-scale-in">
            <div className="w-10 h-10 border-[3px] border-[#DC3D5A] border-t-transparent rounded-full mx-auto mb-5 animate-spin" />
            <p className="text-warm-500 font-medium">{t('verify.title')}</p>
          </div>
        )}

        {status === 'success' && (
          <div className="bg-white rounded-3xl p-8 shadow-[0_2px_12px_rgba(0,0,0,0.06)] border border-warm-200/40 animate-scale-in">
            <div className="w-14 h-14 rounded-full bg-[#2DA87E]/10 flex items-center justify-center mx-auto mb-5">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#2DA87E" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 6L9 17L4 12" />
              </svg>
            </div>
            <p className="text-gray-900 font-semibold">{t('verify.success')}</p>
            <p className="mt-2 text-sm text-warm-400">{t('verify.redirect')}</p>
          </div>
        )}

        {status === 'error' && (
          <div className="bg-white rounded-3xl p-8 shadow-[0_2px_12px_rgba(0,0,0,0.06)] border border-warm-200/40 animate-scale-in">
            <div className="w-14 h-14 rounded-full bg-[#DC3D5A]/10 flex items-center justify-center mx-auto mb-5">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#DC3D5A" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </div>
            <p className="text-[#DC3D5A] font-semibold">{t('verify.error')}</p>
          </div>
        )}
      </div>
    </div>
  );
}
