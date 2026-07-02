import React from 'react';
import { useNavigate } from 'react-router-dom';
import PropTypes from 'prop-types';
import { Badge, logoUrl } from '../components/ui.jsx';
import { useBodyClass } from '../hooks/useBodyClass.js';
import { useDocumentTitle } from '../hooks/useDocumentTitle.js';
import { clearAuthSession, storeAuthSession } from '../lib/auth-session.js';
import { AuthRequestError, loginAdmin } from '../services/auth.js';

const ADMIN_EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function LoginPage() {
  useBodyClass('login-page');
  useDocumentTitle('EduGuard system — Admin Login');

  const navigate = useNavigate();
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [showPassword, setShowPassword] = React.useState(false);
  const [status, setStatus] = React.useState('');
  const [statusTone, setStatusTone] = React.useState('default');
  const [errors, setErrors] = React.useState({ email: '', password: '' });
  const [submitting, setSubmitting] = React.useState(false);
  const passwordRef = React.useRef(null);

  const resetErrors = () => {
    setErrors({ email: '', password: '' });
  };

  const validateIdentityStep = () => {
    const nextErrors = { email: '', password: '' };
    const normalizedEmail = email.trim().toLowerCase();
    const trimmedPassword = password.trim();
    let valid = true;

    if (!normalizedEmail) {
      nextErrors.email = 'Enter the admin email address.';
      valid = false;
    } else if (!ADMIN_EMAIL_PATTERN.test(normalizedEmail)) {
      nextErrors.email = 'Enter a valid email address.';
      valid = false;
    }

    if (!trimmedPassword) {
      nextErrors.password = 'Enter the admin password.';
      valid = false;
    } else if (trimmedPassword.length < 8) {
      nextErrors.password = 'Password must be at least 8 characters.';
      valid = false;
    }

    return { valid, nextErrors, normalizedEmail, trimmedPassword };
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (submitting) return;

    resetErrors();

    const { valid, nextErrors, normalizedEmail, trimmedPassword } = validateIdentityStep();
    setErrors(nextErrors);

    if (!valid) {
      setStatus('Check the email address and password, then try again.');
      setStatusTone('error');
      return;
    }

    setSubmitting(true);

    try {
      setStatus('Contacting authentication service…');
      setStatusTone('info');

      const response = await loginAdmin(normalizedEmail, trimmedPassword);
      clearAuthSession();
      storeAuthSession({
        accessToken: response.access_token,
        refreshToken: response.refresh_token,
        role: response.role,
        username: normalizedEmail,
        expiresInSeconds: response.expires_in,
      });

      setStatus('Authentication successful. Redirecting to dashboard…');
      setStatusTone('success');
      window.setTimeout(() => navigate('/dashboard'), 1100);
    } catch (error) {
      const message = error instanceof AuthRequestError && error.message ? error.message : 'Authentication failed. Please try again.';
      setStatus(message);
      setStatusTone('error');
      setErrors((current) => ({
        ...current,
        password: message.toLowerCase().includes('invalid') ? 'Invalid admin credentials.' : current.password,
      }));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="login-shell min-h-screen bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.18),_transparent_42%),linear-gradient(180deg,#020617_0%,#0f172a_100%)] px-4 py-10 text-slate-100 sm:px-6 lg:px-8">
      <section className="login-card mx-auto flex w-full max-w-lg flex-col gap-6 rounded-3xl border border-white/10 bg-white/5 p-6 shadow-2xl shadow-black/30 backdrop-blur-xl sm:p-8" aria-labelledby="login-title">
        <div className="login-brand flex items-center gap-4">
          <img src={logoUrl} alt="EduGuard system" className="login-brand__logo h-14 w-14 rounded-2xl shadow-lg shadow-black/20 ring-1 ring-white/10" />
          <div className="space-y-1">
            <p className="login-brand__eyebrow text-xs font-semibold uppercase tracking-[0.28em] text-cyan-200/90">EduGuard system</p>
            <h1 id="login-title" className="text-3xl font-semibold tracking-tight sm:text-4xl">Admin Login</h1>
          </div>
        </div>

        <p className="login-card__intro text-sm leading-7 text-slate-300 sm:text-base">
          Sign in with your school admin account to continue to the dashboard.
        </p>

        <form className="login-form space-y-5" noValidate onSubmit={handleSubmit}>
          <div className="field-group space-y-2">
            <label htmlFor="email" className="text-sm font-medium text-slate-200">Email address</label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="username"
              placeholder="admin@eduguard-system.ug"
              required
              aria-invalid={Boolean(errors.email)}
              aria-describedby="email-error"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-slate-100 outline-none ring-0 transition placeholder:text-slate-500 focus:border-cyan-400/60 focus:bg-slate-950 focus:shadow-[0_0_0_4px_rgba(34,211,238,0.12)]"
            />
            <p className="field-error min-h-5 text-sm text-rose-300" id="email-error" aria-live="polite">{errors.email}</p>
          </div>

          <div className="field-group space-y-2">
            <label htmlFor="password" className="text-sm font-medium text-slate-200">Password</label>
            <div className="password-field flex items-stretch gap-3">
              <input
                id="password"
                ref={passwordRef}
                name="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                placeholder="EduGuard2025"
                required
                minLength={8}
                maxLength={128}
                aria-invalid={Boolean(errors.password)}
                aria-describedby="password-error"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="min-w-0 flex-1 rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-slate-100 outline-none ring-0 transition placeholder:text-slate-500 focus:border-cyan-400/60 focus:bg-slate-950 focus:shadow-[0_0_0_4px_rgba(34,211,238,0.12)]"
              />
              <button
                className="password-toggle inline-flex items-center justify-center rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-medium text-slate-100 transition hover:bg-white/10"
                type="button"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                onClick={() => setShowPassword((value) => !value)}
              >
                {showPassword ? 'Hide' : 'Show'}
              </button>
            </div>
            <p className="field-error min-h-5 text-sm text-rose-300" id="password-error" aria-live="polite">{errors.password}</p>
          </div>

          <div className="login-status rounded-2xl border border-white/10 px-4 py-3 text-sm leading-6" id="login-status" aria-live="polite" data-tone={statusTone}>
            {status}
          </div>

          <button className="btn btn-primary btn-lg login-submit inline-flex w-full items-center justify-center rounded-2xl bg-cyan-400 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300 focus:outline-none focus:ring-2 focus:ring-cyan-300 focus:ring-offset-2 focus:ring-offset-slate-950 disabled:cursor-not-allowed disabled:opacity-70" type="submit" data-submit-button disabled={submitting}>
            {submitting ? 'Logging in…' : 'Sign in'}
          </button>
        </form>

        <p className="login-card__hint text-center text-xs uppercase tracking-[0.2em] text-slate-400">
          Use your authorized school admin credentials.
        </p>
      </section>
    </main>
  );
}

LoginPage.propTypes = {};

export default LoginPage;
