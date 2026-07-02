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
    <main className="login-shell">
      <section className="login-card" aria-labelledby="login-title">
        <div className="login-brand">
          <img src={logoUrl} alt="EduGuard system" className="login-brand__logo" />
          <div>
            <p className="login-brand__eyebrow">EduGuard system</p>
            <h1 id="login-title">Admin Login</h1>
          </div>
        </div>

        <p className="login-card__intro">
          Sign in with your school admin account to continue to the dashboard.
        </p>

        <form className="login-form" noValidate onSubmit={handleSubmit}>
          <div className="field-group">
            <label htmlFor="email">Email address</label>
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
            />
            <p className="field-error" id="email-error" aria-live="polite">{errors.email}</p>
          </div>

          <div className="field-group">
            <label htmlFor="password">Password</label>
            <div className="password-field">
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
              />
              <button
                className="password-toggle"
                type="button"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                onClick={() => setShowPassword((value) => !value)}
              >
                {showPassword ? 'Hide' : 'Show'}
              </button>
            </div>
            <p className="field-error" id="password-error" aria-live="polite">{errors.password}</p>
          </div>

          <div className="login-status" id="login-status" aria-live="polite" data-tone={statusTone}>
            {status}
          </div>

          <button className="btn btn-primary btn-lg login-submit" type="submit" data-submit-button disabled={submitting}>
            {submitting ? 'Logging in…' : 'Sign in'}
          </button>
        </form>

        <p className="login-card__hint">
          Use your authorized school admin credentials.
        </p>
      </section>
    </main>
  );
}

LoginPage.propTypes = {};

export default LoginPage;
