import { useState } from 'react';
import { Wallet, Mail, Lock, AlertCircle } from 'lucide-react';
import { api } from './api';

interface Props {
  onLogin: (token: string, email: string) => void;
}

export default function AuthScreen({ onLogin }: Props) {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (mode === 'register') {
        await api.register(email, password);
      }
      const { access_token } = await api.login(email, password);
      onLogin(access_token, email);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : '오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 bg-ink-50">
      <div className="w-full max-w-sm">

        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="h-14 w-14 rounded-2xl bg-mint-500 grid place-items-center shadow-soft mb-3">
            <Wallet size={26} strokeWidth={2.2} className="text-white" />
          </div>
          <div className="text-[11px] uppercase tracking-[0.2em] text-ink-400 font-semibold">Ledger</div>
          <div className="text-[22px] font-bold text-ink-900 mt-0.5">가계부</div>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl border border-ink-100 shadow-soft p-6">

          {/* Mode toggle */}
          <div className="grid grid-cols-2 bg-ink-50 rounded-xl p-1 text-[13px] font-semibold mb-5">
            <button type="button" onClick={() => { setMode('login'); setError(''); }}
              className={`py-2 rounded-lg transition ${mode === 'login' ? 'bg-white shadow-sm text-mint-700' : 'text-ink-400'}`}>
              로그인
            </button>
            <button type="button" onClick={() => { setMode('register'); setError(''); }}
              className={`py-2 rounded-lg transition ${mode === 'register' ? 'bg-white shadow-sm text-mint-700' : 'text-ink-400'}`}>
              회원가입
            </button>
          </div>

          <form onSubmit={submit} className="space-y-3">
            {/* Email */}
            <div>
              <label className="text-[11px] font-semibold uppercase tracking-wider text-ink-400">이메일</label>
              <div className="relative mt-1">
                <Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
                <input
                  type="email" value={email} onChange={e => setEmail(e.target.value)}
                  placeholder="example@email.com" required
                  className="w-full rounded-xl border border-ink-200 bg-white pl-9 pr-3 py-2.5 text-[14px] focus:border-mint-500 focus:outline-none focus:ring-2 focus:ring-mint-200"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="text-[11px] font-semibold uppercase tracking-wider text-ink-400">비밀번호</label>
              <div className="relative mt-1">
                <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
                <input
                  type="password" value={password} onChange={e => setPassword(e.target.value)}
                  placeholder="비밀번호 입력" required minLength={6}
                  className="w-full rounded-xl border border-ink-200 bg-white pl-9 pr-3 py-2.5 text-[14px] focus:border-mint-500 focus:outline-none focus:ring-2 focus:ring-mint-200"
                />
              </div>
            </div>

            {/* Error */}
            {error && (
              <div className="flex items-center gap-1.5 text-[12px] text-rose-600">
                <AlertCircle size={14} /> {error}
              </div>
            )}

            {/* Submit */}
            <button type="submit" disabled={loading}
              className="w-full py-3 mt-1 rounded-xl bg-mint-500 text-white text-sm font-semibold hover:bg-mint-600 active:scale-[0.98] transition disabled:bg-ink-200 disabled:text-ink-400">
              {loading ? '처리 중...' : mode === 'login' ? '로그인' : '회원가입'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
