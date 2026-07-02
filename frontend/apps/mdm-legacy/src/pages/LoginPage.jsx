import React from 'react';
import { useNavigate } from 'react-router-dom';
import PropTypes from 'prop-types';
import { Badge, logoUrl } from '../components/ui.jsx';
import { useBodyClass } from '../hooks/useBodyClass.js';
import { useDocumentTitle } from '../hooks/useDocumentTitle.js';

const EXPECTED_EMAIL = 'admin@eduguard-system.ug';
const EXPECTED_PASSWORD = 'EduGuard2025';
const EXPECTED_OTP = '246810';

function LoginPage() {
  useBodyClass('login-page');
  useDocumentTitle('EduGuard system — Admin Login');

  const navigate = useNavigate();
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [otpDigits, setOtpDigits] = React.useState(['', '', '', '', '', '']);
  const [showOtp, setShowOtp] = React.useState(false);
  const [showPassword, setShowPassword] = React.useState(false);
  const [status, setStatus] = React.useState('');
  const [statusTone, setStatusTone] = React.useState('default');
  const [errors, setErrors] = React.useState({ email: '', password: '', otp: '' });
  const [submitting, setSubmitting] = React.useState(false);
  const otpRefs = React.useRef([]);
  const passwordRef = React.useRef(null);

  const focusOtp = (index = 0) => {
    const node = otpRefs.current[index] || otpRefs.current.find(Boolean);
    node?.focus();
  };

  const handleDigitChange = (index, value) => {
    const nextDigits = [...otpDigits];
    nextDigits[index] = value.replace(/\D/g, '').slice(0, 1);
    setOtpDigits(nextDigits);
    setErrors((current) => ({ ...current, otp: '' }));
    if (nextDigits[index] && index < otpRefs.current.length - 1) {
      window.requestAnimationFrame(() => focusOtp(index + 1));
    }
  };

  const handleDigitKeyDown = (index, event) => {
    if (event.key === 'Backspace' && !otpDigits[index] && index > 0) {
      focusOtp(index - 1);
    }
  };

  const handlePaste = (event) => {
    const pasted = event.clipboardData?.getData('text') || '';
    const digits = pasted.replace(/\D/g, '').slice(0, 6).split('');
    if (!digits.length) return;
    event.preventDefault();
    const nextDigits = Array.from({ length: 6 }, (_, index) => digits[index] || '');
    setOtpDigits(nextDigits);
    window.requestAnimationFrame(() => focusOtp(digits.length < 6 ? digits.length : 5));
  };

  const resetErrors = () => {
    setErrors({ email: '', password: '', otp: '' });
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    if (submitting) return;

    resetErrors();
    const emailValue = email.trim().toLowerCase();
    const passwordValue = password.trim();

    if (!showOtp) {
      let valid = true;
      const nextErrors = { email: '', password: '', otp: '' };

      if (!emailValue || emailValue !== EXPECTED_EMAIL) {
        nextErrors.email = 'Use the admin email provided for the prototype.';
        valid = false;
      }

      if (!passwordValue || passwordValue !== EXPECTED_PASSWORD) {
        nextErrors.password = 'Use the mock password provided for the prototype.';
        valid = false;
      }

      setErrors(nextErrors);
      if (!valid) {
        setStatus('Check your credentials and try again.');
        setStatusTone('error');
        return;
      }

      setShowOtp(true);
      setStatus('Credentials accepted. Enter the 2FA code to continue.');
      setStatusTone('info');
      window.requestAnimationFrame(() => focusOtp(0));
      return;
    }

    const otpValue = otpDigits.join('');
    if (otpValue.length !== 6) {
      setErrors((current) => ({ ...current, otp: 'Enter all 6 digits of the demo code.' }));
      setStatus('2FA code incomplete.');
      setStatusTone('error');
      focusOtp(0);
      return;
    }

    if (otpValue !== EXPECTED_OTP) {
      setErrors((current) => ({ ...current, otp: 'Invalid 2FA code for this demo.' }));
      setStatus('2FA verification failed.');
      setStatusTone('error');
      focusOtp(0);
      return;
    }

    setSubmitting(true);
    setStatus('Authentication successful. Redirecting to dashboard…');
    setStatusTone('success');
    window.setTimeout(() => navigate('/dashboard'), 1100);
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
          Sign in with your school admin account, then confirm the 2FA code to continue to the dashboard.
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

          <div className="twofa-step" data-twofa-step hidden={!showOtp}>
            <div className="twofa-step__header">
              <div>
                <h2>2FA verification</h2>
                <p>Enter the 6-digit demo code to continue. This step simulates TOTP verification for the prototype.</p>
              </div>
              <Badge tone="syncing">2FA required</Badge>
            </div>

            <div className="otp-group" role="group" aria-label="Two factor authentication code">
              {otpDigits.map((digit, index) => (
                <input
                  key={index}
                  ref={(node) => {
                    otpRefs.current[index] = node;
                  }}
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength="1"
                  aria-label={`Digit ${index + 1}`}
                  data-otp-input
                  value={digit}
                  onChange={(event) => handleDigitChange(index, event.target.value)}
                  onKeyDown={(event) => handleDigitKeyDown(index, event)}
                  onPaste={handlePaste}
                />
              ))}
            </div>

            <p className="twofa-note">Demo TOTP code: <strong>246810</strong></p>
            <p className="field-error" id="otp-error" aria-live="polite">{errors.otp}</p>
          </div>

          <div className="login-status" id="login-status" aria-live="polite" data-tone={statusTone}>
            {status}
          </div>

          <button className="btn btn-primary btn-lg login-submit" type="submit" data-submit-button disabled={submitting}>
            {submitting ? 'Logging in…' : 'Sign in'}
          </button>
        </form>

        <p className="login-card__hint">
          Mock credentials: <strong>admin@eduguard-system.ug</strong> / <strong>EduGuard2025</strong>
        </p>
      </section>
    </main>
  );
}

LoginPage.propTypes = {};

export default LoginPage;
