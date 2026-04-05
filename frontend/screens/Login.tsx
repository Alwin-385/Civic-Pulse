import React, { useState } from 'react';
import { UserRole } from '../types';
import { apiRequest, getApiBaseUrl } from '../apiClient';

interface LoginProps {
  onLogin: (auth: { token: string; role: UserRole }) => void;
}

type Mode = 'signin' | 'register' | 'forgot' | 'verify' | 'reset';

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [mode, setMode] = useState<Mode>('signin');
  const [role, setRole] = useState<UserRole>(UserRole.CITIZEN);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleResendOtp = async () => {
    if (!email.trim()) return;
    setError(null);
    setLoading(true);
    try {
      const data = await apiRequest<{ message: string; devOtp?: string }>('/api/auth/resend-otp', {
        method: 'POST',
        body: { email: email.trim() },
      });
      let msg = data.message || 'A new code has been sent.';
      if (data.devOtp) {
        msg += ` (dev: ${data.devOtp})`;
      }
      setSuccessMsg(msg);
    } catch (e: any) {
      setError(e?.message ?? 'Could not resend code.');
    } finally {
      setLoading(false);
    }
  };

  const handleResendResetCode = async () => {
    if (!email.trim()) return;
    setError(null);
    setLoading(true);
    try {
      const data = await apiRequest<{ message: string; devOtp?: string }>('/api/auth/forgot-password', {
        method: 'POST',
        body: { email: email.trim() },
      });
      let msg = data.message || 'A new reset code has been sent.';
      if (data.devOtp) {
        msg += ` (dev: ${data.devOtp})`;
      }
      setSuccessMsg(msg);
    } catch (e: any) {
      setError(e?.message ?? 'Could not send reset code.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (mode !== 'verify' && mode !== 'reset') setSuccessMsg(null);
    setLoading(true);

    try {
      if (mode === 'verify') {
        const code = otp.replace(/\D/g, '').slice(0, 6);
        if (code.length !== 6) {
          setError('Enter the 6-digit code from your email.');
          setLoading(false);
          return;
        }
        await apiRequest<{ message: string }>('/api/auth/verify-email', {
          method: 'POST',
          body: { email: email.trim(), code },
        });
        setOtp('');
        setMode('signin');
        setSuccessMsg('Email verified. You can sign in now.');
        return;
      }

      if (mode === 'register') {
        const data = await apiRequest<{
          message: string;
          verificationRequired: boolean;
          email: string;
          devOtp?: string;
        }>('/api/auth/register', {
          method: 'POST',
          body: { name, email, password, role },
        });

        if (data.verificationRequired) {
          setMode('verify');
          let msg = data.message || 'Check your email for a verification code.';
          if (data.devOtp) {
            msg += ` (dev: ${data.devOtp})`;
          }
          setSuccessMsg(msg);
        } else {
          setMode('signin');
          setSuccessMsg(data.message || 'Account created successfully! Please sign in.');
        }
      } else if (mode === 'forgot') {
        const data = await apiRequest<{ message: string; devOtp?: string }>('/api/auth/forgot-password', {
          method: 'POST',
          body: { email: email.trim() },
        });
        let msg = data.message || 'Check your email for a reset code.';
        if (data.devOtp) {
          msg += ` (dev: ${data.devOtp})`;
        }
        setOtp('');
        setPassword('');
        setSuccessMsg(msg);
        setMode('reset');
      } else if (mode === 'reset') {
        const code = otp.replace(/\D/g, '').slice(0, 6);
        if (code.length !== 6) {
          setError('Enter the 6-digit code from your email.');
          setLoading(false);
          return;
        }
        const data = await apiRequest<{ message: string }>('/api/auth/reset-password', {
          method: 'POST',
          body: { email: email.trim(), code, newPassword: password },
        });
        setOtp('');
        setPassword('');
        setMode('signin');
        setSuccessMsg(data.message || 'Password updated. You can sign in now.');
      } else {
        const data = await apiRequest<{ token: string; user: any }>('/api/auth/login', {
          method: 'POST',
          body: { email, password, role },
        });

        onLogin({ token: data.token, role: data.user.role });
      }
    } catch (e: any) {
      if (e?.verificationRequired && e?.email) {
        setMode('verify');
        setEmail(String(e.email));
        setSuccessMsg(e.message || 'Please verify your email to continue.');
        setError(null);
      } else {
        setError(e?.message ?? 'An error occurred. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex font-sans text-slate-900">
      
      {/* LEFT PANE - AESTHETIC HERO (Hidden on Mobile) */}
      <div className="hidden lg:flex lg:w-1/2 relative bg-slate-900 overflow-hidden flex-col justify-between p-12">
        {/* Dynamic Abstract Background Elements */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0">
          <div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] rounded-full bg-indigo-600/30 blur-[120px]"></div>
          <div className="absolute bottom-[-20%] left-[-10%] w-[600px] h-[600px] rounded-full bg-blue-500/20 blur-[150px]"></div>
        </div>

        <div className="relative z-10 flex items-center gap-3">
          <div className="size-10 bg-gradient-to-tr from-indigo-500 to-blue-400 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/30">
            <span className="material-symbols-outlined text-white text-xl">holiday_village</span>
          </div>
          <h1 className="text-xl font-bold tracking-tight text-white">Civic Pulse</h1>
        </div>

        <div className="relative z-10 space-y-6 max-w-lg">
          <h2 className="text-5xl font-black text-white leading-tight tracking-tight mt-4">
            <span className="text-yellow-400">⚡</span> Report. Track.<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-cyan-300">
              Resolve.
            </span>
          </h2>
          <p className="text-lg text-slate-300 font-medium leading-relaxed">
            Seamlessly connect with KSEB and PWD departments. Report issues, monitor progress in real-time, and ensure faster resolution.
          </p>
          
          <div className="flex gap-4 mt-8">
            <div className="flex -space-x-4">
              <img src="https://picsum.photos/seed/u1/100/100" className="w-12 h-12 rounded-full border-4 border-slate-900" alt="User" />
              <img src="https://picsum.photos/seed/u2/100/100" className="w-12 h-12 rounded-full border-4 border-slate-900" alt="User" />
              <img src="https://picsum.photos/seed/u3/100/100" className="w-12 h-12 rounded-full border-4 border-slate-900" alt="User" />
            </div>
            <div className="flex flex-col justify-center">
              <div className="flex text-amber-400 text-sm">
                <span className="material-symbols-outlined shrink-0" style={{fontVariationSettings: "'FILL' 1"}}>star</span>
                <span className="material-symbols-outlined shrink-0" style={{fontVariationSettings: "'FILL' 1"}}>star</span>
                <span className="material-symbols-outlined shrink-0" style={{fontVariationSettings: "'FILL' 1"}}>star</span>
                <span className="material-symbols-outlined shrink-0" style={{fontVariationSettings: "'FILL' 1"}}>star</span>
                <span className="material-symbols-outlined shrink-0" style={{fontVariationSettings: "'FILL' 1"}}>star</span>
              </div>
              <p className="text-xs text-slate-400 font-medium">Trusted by 10,000+ residents</p>
            </div>
          </div>
        </div>

        <div className="relative z-10 text-slate-500 text-sm font-medium">
          &copy; {new Date().getFullYear()} Civic Pulse Inc. All rights reserved.
        </div>
      </div>

      {/* RIGHT PANE - INTERACTIVE LOGIN FORM */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 sm:p-12 absolute lg:relative inset-0 overflow-y-auto">
        
        {/* Mobile App Branding */}
        <div className="lg:hidden absolute top-8 left-8 flex items-center gap-3">
          <div className="size-8 bg-indigo-600 rounded-lg flex items-center justify-center shadow-lg shadow-indigo-500/30">
            <span className="material-symbols-outlined text-white text-sm">holiday_village</span>
          </div>
          <h1 className="text-lg font-bold tracking-tight text-slate-900">Civic Pulse</h1>
        </div>

        <div className="w-full max-w-md space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 ease-out">
          
          <div className="space-y-2">
            <h2 className="text-3xl font-bold tracking-tight text-slate-900">
              {mode === 'signin'
                ? 'Welcome back'
                : mode === 'forgot'
                  ? 'Reset password'
                  : mode === 'reset'
                    ? 'Choose a new password'
                    : mode === 'verify'
                      ? 'Verify your email'
                      : 'Create an account'}
            </h2>
            <p className="text-slate-500 text-sm font-medium">
              {mode === 'signin'
                ? 'Enter your details to access your dashboard.'
                : mode === 'forgot'
                  ? 'We will email you a 6-digit code to reset your password.'
                  : mode === 'reset'
                    ? 'Enter the code from your email and your new password below.'
                    : mode === 'verify'
                      ? 'Enter the 6-digit code we sent to your inbox.'
                      : 'Start reporting issues in seconds.'}
            </p>
          </div>

          {(mode === 'signin' || mode === 'register') && (
            <div className="bg-slate-100 p-1.5 rounded-xl flex shadow-inner">
              <button
                onClick={() => setRole(UserRole.CITIZEN)}
                className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${role === UserRole.CITIZEN ? 'bg-white text-indigo-600 shadow-sm ring-1 ring-slate-200/50 scale-[1.02]' : 'text-slate-500 hover:text-slate-700'}`}
              >
                Citizen
              </button>
              <button
                onClick={() => setRole(UserRole.OFFICIAL)}
                className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${role === UserRole.OFFICIAL ? 'bg-white text-indigo-600 shadow-sm ring-1 ring-slate-200/50 scale-[1.02]' : 'text-slate-500 hover:text-slate-700'}`}
              >
                Official
              </button>
            </div>
          )}

          {successMsg && (
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex gap-3 text-emerald-700 text-sm font-medium animate-in fade-in zoom-in-95 duration-300">
              <span className="material-symbols-outlined shrink-0 text-emerald-500">check_circle</span>
              <p>{successMsg}</p>
            </div>
          )}

          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-2xl flex gap-3 text-red-700 text-sm font-medium animate-in fade-in zoom-in-95 duration-300">
              <span className="material-symbols-outlined shrink-0 text-red-500">error</span>
              <p>{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {mode === 'register' && (
              <div className="space-y-1.5 group">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-500 ml-1 group-focus-within:text-indigo-600 transition-colors">Name</label>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors">person</span>
                  <input
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full pl-12 pr-4 py-3.5 bg-white border border-slate-200 rounded-2xl focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all placeholder:text-slate-400 shadow-sm font-medium"
                    placeholder="Enter full name"
                    type="text"
                  />
                </div>
              </div>
            )}

            {(mode === 'signin' || mode === 'register' || mode === 'forgot') && (
              <div className="space-y-1.5 group">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-500 ml-1 group-focus-within:text-indigo-600 transition-colors">Email Address</label>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors">alternate_email</span>
                  <input
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-12 pr-4 py-3.5 bg-white border border-slate-200 rounded-2xl focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all placeholder:text-slate-400 shadow-sm font-medium"
                    placeholder="name@example.com"
                    type="email"
                  />
                </div>
              </div>
            )}

            {mode === 'verify' && (
              <>
                <div className="space-y-1.5 group">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-500 ml-1">Email Address</label>
                  <div className="relative">
                    <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">alternate_email</span>
                    <input
                      readOnly
                      value={email}
                      className="w-full pl-12 pr-4 py-3.5 bg-slate-100 border border-slate-200 rounded-2xl outline-none shadow-sm font-medium text-slate-600"
                      type="email"
                    />
                  </div>
                </div>
                <div className="space-y-1.5 group">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-500 ml-1 group-focus-within:text-indigo-600 transition-colors">Verification code</label>
                  <div className="relative">
                    <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors">pin</span>
                    <input
                      required
                      value={otp}
                      onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      className="w-full pl-12 pr-4 py-3.5 bg-white border border-slate-200 rounded-2xl focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all placeholder:text-slate-400 shadow-sm font-medium tracking-widest"
                      placeholder="000000"
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      maxLength={6}
                    />
                  </div>
                </div>
              </>
            )}

            {mode === 'reset' && (
              <>
                <div className="space-y-1.5 group">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-500 ml-1">Email Address</label>
                  <div className="relative">
                    <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">alternate_email</span>
                    <input
                      readOnly
                      value={email}
                      className="w-full pl-12 pr-4 py-3.5 bg-slate-100 border border-slate-200 rounded-2xl outline-none shadow-sm font-medium text-slate-600"
                      type="email"
                    />
                  </div>
                </div>
                <div className="space-y-1.5 group">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-500 ml-1 group-focus-within:text-indigo-600 transition-colors">Reset code</label>
                  <div className="relative">
                    <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors">pin</span>
                    <input
                      required
                      value={otp}
                      onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      className="w-full pl-12 pr-4 py-3.5 bg-white border border-slate-200 rounded-2xl focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all placeholder:text-slate-400 shadow-sm font-medium tracking-widest"
                      placeholder="000000"
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      maxLength={6}
                    />
                  </div>
                </div>
                <div className="space-y-1.5 group">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-500 ml-1 group-focus-within:text-indigo-600 transition-colors">New password</label>
                  <div className="relative">
                    <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors">lock</span>
                    <input
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full pl-12 pr-4 py-3.5 bg-white border border-slate-200 rounded-2xl focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all placeholder:text-slate-400 shadow-sm font-medium"
                      placeholder="••••••••"
                      type="password"
                      minLength={6}
                      autoComplete="new-password"
                    />
                  </div>
                </div>
              </>
            )}

            {(mode === 'signin' || mode === 'register') && (
              <div className="space-y-1.5 group">
                <div className="flex justify-between items-center ml-1">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-500 group-focus-within:text-indigo-600 transition-colors">Password</label>
                  {mode === 'signin' && (
                    <button type="button" onClick={() => { setMode('forgot'); setError(null); setSuccessMsg(null); }} className="text-xs font-bold text-indigo-600 hover:text-indigo-500 transition-colors">
                      Forgot password?
                    </button>
                  )}
                </div>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors">lock</span>
                  <input
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-12 pr-4 py-3.5 bg-white border border-slate-200 rounded-2xl focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all placeholder:text-slate-400 shadow-sm font-medium"
                    placeholder="••••••••"
                    type="password"
                    minLength={6}
                  />
                </div>
              </div>
            )}

            <button
              disabled={loading}
              className="w-full relative overflow-hidden bg-slate-900 text-white font-bold py-4 rounded-2xl flex items-center justify-center gap-2 hover:bg-slate-800 active:scale-[0.98] transition-all disabled:opacity-70 group shadow-xl shadow-slate-900/10 mt-6"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent translate-x-[-100%] group-hover:animate-[shimmer_1.5s_infinite]"></div>
              <span className="relative z-10">
                {loading
                  ? 'Please wait...'
                  : mode === 'signin'
                    ? 'Sign In'
                    : mode === 'forgot'
                      ? 'Send reset code'
                      : mode === 'reset'
                        ? 'Update password'
                        : mode === 'verify'
                          ? 'Verify email'
                          : 'Create Account'}
              </span>
              {!loading && (mode === 'signin' || mode === 'register') && (
                <span className="material-symbols-outlined text-sm relative z-10 group-hover:translate-x-1 transition-transform">arrow_forward</span>
              )}
            </button>

            {mode === 'verify' && (
              <button
                type="button"
                disabled={loading || !email.trim()}
                onClick={handleResendOtp}
                className="w-full font-bold py-3 rounded-2xl border border-slate-200 text-slate-700 hover:bg-slate-50 active:scale-[0.98] transition-all disabled:opacity-50 text-sm"
              >
                Resend code
              </button>
            )}

            {mode === 'reset' && (
              <button
                type="button"
                disabled={loading || !email.trim()}
                onClick={handleResendResetCode}
                className="w-full font-bold py-3 rounded-2xl border border-slate-200 text-slate-700 hover:bg-slate-50 active:scale-[0.98] transition-all disabled:opacity-50 text-sm"
              >
                Resend reset code
              </button>
            )}
          </form>

          {(mode === 'signin' || mode === 'register') && (
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-200"></div>
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="bg-slate-50 px-4 text-slate-400 uppercase tracking-wider font-bold">Or</span>
              </div>
            </div>
          )}

          {(mode === 'signin' || mode === 'register') && (
            <button
              type="button"
              onClick={() => window.location.href = `${getApiBaseUrl()}/api/auth/google?role=${role}`}
              className="w-full bg-white border border-slate-200 text-slate-700 font-bold py-3.5 rounded-2xl shadow-sm flex items-center justify-center gap-3 hover:bg-slate-50 hover:border-slate-300 active:scale-[0.98] transition-all"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              Continue with Google
            </button>
          )}

          <p className="text-center text-sm font-medium text-slate-500 pt-4">
            {mode === 'verify'
              ? 'Wrong account? '
              : mode === 'reset'
                ? 'Wrong email? '
                : mode === 'signin'
                  ? "Don't have an account? "
                  : mode === 'forgot'
                    ? 'Remembered your password? '
                    : 'Already have an account? '}
            <button
              type="button"
              className="text-indigo-600 hover:text-indigo-700 font-bold hover:underline underline-offset-4 transition-colors"
              onClick={() => {
                setError(null);
                setSuccessMsg(null);
                setOtp('');
                if (mode === 'verify' || mode === 'reset' || mode === 'forgot') {
                  setMode('signin');
                  return;
                }
                setMode((m) => (m === 'signin' ? 'register' : 'signin'));
              }}
            >
              {mode === 'verify' || mode === 'reset' || mode === 'forgot'
                ? 'Back to sign in'
                : mode === 'signin'
                  ? `Sign up as ${role === UserRole.CITIZEN ? 'Citizen' : 'Official'}`
                  : 'Sign in'}
            </button>
          </p>

        </div>
      </div>
    </div>
  );
};

export default Login;
