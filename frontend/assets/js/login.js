// Login page logic for EduGuard system
// Handles credential validation, show/hide password, 2FA code entry, and redirect.
(function () {
  const EXPECTED_EMAIL = 'admin@eduguard-system.ug';
  const EXPECTED_PASSWORD = 'EduGuard2025';
  const EXPECTED_OTP = '246810';

  function qs(selector, root = document) {
    return root.querySelector(selector);
  }

  function qsa(selector, root = document) {
    return Array.from(root.querySelectorAll(selector));
  }

  const form = qs('#login-form');
  const email = qs('#email');
  const password = qs('#password');
  const emailError = qs('#email-error');
  const passwordError = qs('#password-error');
  const otpError = qs('#otp-error');
  const status = qs('#login-status');
  const twofaStep = qs('[data-twofa-step]');
  const toggleButton = qs('[data-password-toggle]');
  const otpInputs = qsa('[data-otp-input]');
  const submitButton = qs('[data-submit-button]');

  if (!form || !email || !password || !twofaStep || !toggleButton || !otpInputs.length) return;

  let twofaEnabled = false;

  function setStatus(message, tone = 'default') {
    status.textContent = message;
    status.dataset.tone = tone;
  }

  function showFieldError(field, errorNode, message) {
    field.setAttribute('aria-invalid', 'true');
    errorNode.textContent = message;
  }

  function clearFieldError(field, errorNode) {
    field.removeAttribute('aria-invalid');
    errorNode.textContent = '';
  }

  function getOtpValue() {
    return otpInputs.map((input) => input.value.trim()).join('');
  }

  function focusFirstOtp() {
    const firstEmpty = otpInputs.find((input) => !input.value.trim()) || otpInputs[0];
    if (firstEmpty) firstEmpty.focus();
  }

  toggleButton.addEventListener('click', () => {
    const isHidden = password.type === 'password';
    password.type = isHidden ? 'text' : 'password';
    toggleButton.textContent = isHidden ? 'Hide' : 'Show';
    toggleButton.setAttribute('aria-label', isHidden ? 'Hide password' : 'Show password');
  });

  otpInputs.forEach((input, index) => {
    input.addEventListener('input', () => {
      input.value = input.value.replace(/\D/g, '').slice(0, 1);
      clearFieldError(input, otpError);
      if (input.value && otpInputs[index + 1]) otpInputs[index + 1].focus();
    });

    input.addEventListener('keydown', (event) => {
      if (event.key === 'Backspace' && !input.value && otpInputs[index - 1]) {
        otpInputs[index - 1].focus();
      }
    });

    input.addEventListener('paste', (event) => {
      const pasted = event.clipboardData?.getData('text') || '';
      const digits = pasted.replace(/\D/g, '').slice(0, 6).split('');
      if (!digits.length) return;
      event.preventDefault();
      digits.forEach((digit, digitIndex) => {
        if (otpInputs[digitIndex]) otpInputs[digitIndex].value = digit;
      });
      focusFirstOtp();
    });
  });

  form.addEventListener('submit', (event) => {
    event.preventDefault();

    const emailValue = email.value.trim().toLowerCase();
    const passwordValue = password.value.trim();

    clearFieldError(email, emailError);
    clearFieldError(password, passwordError);
    otpError.textContent = '';

    if (!twofaEnabled) {
      let valid = true;

      if (!emailValue || emailValue !== EXPECTED_EMAIL) {
        showFieldError(email, emailError, 'Use the admin email provided for the prototype.');
        valid = false;
      }

      if (!passwordValue || passwordValue !== EXPECTED_PASSWORD) {
        showFieldError(password, passwordError, 'Use the mock password provided for the prototype.');
        valid = false;
      }

      if (!valid) {
        setStatus('Check your credentials and try again.', 'error');
        return;
      }

      twofaEnabled = true;
      twofaStep.hidden = false;
      setStatus('Credentials accepted. Enter the 2FA code to continue.', 'info');
      focusFirstOtp();
      return;
    }

    const otpValue = getOtpValue();
    if (otpValue.length !== 6) {
      otpError.textContent = 'Enter all 6 digits of the demo code.';
      setStatus('2FA code incomplete.', 'error');
      focusFirstOtp();
      return;
    }

    if (otpValue !== EXPECTED_OTP) {
      otpError.textContent = 'Invalid 2FA code for this demo.';
      setStatus('2FA verification failed.', 'error');
      otpInputs[0].focus();
      return;
    }

    if (submitButton) {
      submitButton.disabled = true;
      submitButton.textContent = 'Logging in…';
    }

    setStatus('Authentication successful. Redirecting to dashboard…', 'success');
    window.setTimeout(() => {
      window.location.href = 'dashboard.html';
    }, 1100);
  });
})();
