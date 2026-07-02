import React from 'react';
import { Link } from 'react-router-dom';
import PropTypes from 'prop-types';
import QRCode from 'qrcode';
import { logoUrl } from '../components/ui.jsx';
import { useBodyClass } from '../hooks/useBodyClass.js';
import { useDocumentTitle } from '../hooks/useDocumentTitle.js';
import '../styles/enrollment.css';

const CLASS_GROUPS = ['S.1 Science', 'S.2 Arts', 'S.3 Commerce', 'S.4 Science', 'S.5 PCM', 'S.6 HGE'];

function randomSegment(length) {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let output = '';
  for (let index = 0; index < length; index += 1) {
    output += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return output;
}

function createSignedToken(group, passcode) {
  const payload = {
    deviceClassGroup: group,
    issuedAt: new Date().toISOString(),
    expiresInSeconds: 60,
    nonce: randomSegment(10),
    signature: `mock-signature-${randomSegment(16)}`,
    adminProof: `***${String(passcode).slice(-2)}`,
  };

  return btoa(JSON.stringify(payload));
}

function EnrollmentPage() {
  useBodyClass('enrollment-page');
  useDocumentTitle('EduGuard system — Enrollment');

  const [classGroup, setClassGroup] = React.useState(CLASS_GROUPS[0]);
  const [adminPasscode, setAdminPasscode] = React.useState('');
  const [formError, setFormError] = React.useState('');
  const [token, setToken] = React.useState('');
  const [qrSrc, setQrSrc] = React.useState('');
  const [expiresAt, setExpiresAt] = React.useState(0);
  const [countdown, setCountdown] = React.useState(60);
  const [stage, setStage] = React.useState(1);
  const [pending, setPending] = React.useState([]);
  const [toastMessages, setToastMessages] = React.useState([]);
  const [stepActive, setStepActive] = React.useState(1);
  const intervalRef = React.useRef(null);
  const timeoutRef = React.useRef(null);
  const regenerateRef = React.useRef(null);

  const showToast = (message) => {
    setToastMessages((items) => [...items, { id: `${Date.now()}-${Math.random().toString(16).slice(2)}`, message }]);
    window.setTimeout(() => {
      setToastMessages((items) => items.slice(1));
    }, 2500);
  };

  const updateStage = (value) => {
    setStage(value);
    setStepActive(value);
  };

  const generateToken = async (silent = false) => {
    if (!adminPasscode.trim()) {
      setFormError('Enter the admin passcode before generating the QR code.');
      return;
    }

    const nextToken = createSignedToken(classGroup, adminPasscode.trim());
    const nextExpires = Date.now() + 60000;

    setFormError('');
    setToken(nextToken);
    setExpiresAt(nextExpires);
    updateStage(2);

    try {
      const dataUrl = await QRCode.toDataURL(nextToken, {
        width: 240,
        margin: 1,
        color: {
          dark: '#07111A',
          light: '#ffffff',
        },
      });
      setQrSrc(dataUrl);
    } catch {
      setQrSrc('');
    }

    setCountdown(60);

    if (!silent) {
      showToast('QR code generated');
    }
  };

  regenerateRef.current = generateToken;

  React.useEffect(() => {
    if (!token) return undefined;

    if (intervalRef.current) window.clearInterval(intervalRef.current);
    if (timeoutRef.current) window.clearTimeout(timeoutRef.current);

    intervalRef.current = window.setInterval(() => {
      const remaining = Math.max(0, Math.ceil((expiresAt - Date.now()) / 1000));
      setCountdown(remaining);
      if (remaining <= 0) {
        regenerateRef.current?.(true);
      }
    }, 1000);

    timeoutRef.current = window.setTimeout(() => {
      regenerateRef.current?.(true);
    }, 60000);

    return () => {
      if (intervalRef.current) window.clearInterval(intervalRef.current);
      if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
    };
  }, [token, expiresAt]);

  React.useEffect(() => {
    updateStage(1);
    return () => {
      if (intervalRef.current) window.clearInterval(intervalRef.current);
      if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
    };
  }, []);

  React.useEffect(() => {
    if (!token) return;
    setStepActive(2);
  }, [token]);

  const finalizeEnrollment = () => {
    if (!token) return;
    setPending((items) => [...items, { group: classGroup, token: `${token.slice(0, 12)}…` }]);
    updateStage(3);
    showToast('Device added to pending list');
  };

  return (
    <>
      <a className="skip-link" href="#main-content">Skip to content</a>
      <div className="wizard-toast" id="toastRoot" aria-live="polite" aria-atomic="true">
        {toastMessages.map((toast) => <div key={toast.id} className="toast">{toast.message}</div>)}
      </div>

      <main className="enrollment-shell" id="main-content">
        <div className="enrollment-topbar">
          <Link className="enrollment-brand" to="/" aria-label="EduGuard system home">
            <img src={logoUrl} alt="EduGuard system" />
            <span>
              <strong>EduGuard</strong>
              <small>Enrollment wizard</small>
            </span>
          </Link>
          <Link className="btn btn-outline" to="/dashboard">Back to dashboard</Link>
        </div>

        <section className="enrollment-panel" aria-labelledby="enrollmentTitle">
          <div className="enrollment-panel__header">
            <span className="enrollment-eyebrow">Step 15 · QR Enrollment</span>
            <h1 id="enrollmentTitle">Enroll a device with a single-use QR code.</h1>
            <p className="enrollment-panel__lead">
              The wizard binds a school device class group and admin passcode to a short-lived signed token so the device can appear in the pending list after confirmation.
            </p>
          </div>

          <div className="enrollment-content">
            <div className="wizard-steps" aria-label="Enrollment steps">
              <article className={`wizard-step ${stepActive === 1 ? 'is-active' : ''}`} data-step-card="1">
                <span className="wizard-step__num">1</span>
                <h2>Enter details</h2>
                <p>Choose the device class group and enter the admin passcode.</p>
              </article>
              <article className={`wizard-step ${stepActive === 2 ? 'is-active' : ''}`} data-step-card="2">
                <span className="wizard-step__num">2</span>
                <h2>Scan QR</h2>
                <p>Generate a signed token and display it as a QR code for the device.</p>
              </article>
              <article className={`wizard-step ${stepActive === 3 ? 'is-active' : ''}`} data-step-card="3">
                <span className="wizard-step__num">3</span>
                <h2>Confirm</h2>
                <p>Finish enrollment and add the device to the pending list.</p>
              </article>
            </div>

            <section className="wizard-stage" id="wizardStage">
              <div className="wizard-stage__title">
                <div>
                  <h2 id="stageTitle">{stage === 1 ? 'Step 1: Device details' : stage === 2 ? 'Step 2: Generated QR code' : 'Step 3: Confirmation'}</h2>
                  <p id="stageCopy">
                    {stage === 1
                      ? 'Enter the device class group and the admin passcode to generate a QR enrollment token.'
                      : stage === 2
                        ? 'Scan the generated QR code on the device to complete enrollment.'
                        : 'The device is now in the pending list and ready for policy sync.'}
                  </p>
                </div>
                <div className="countdown" id="countdownWrap">Expires in <span id="countdownValue">{countdown}s</span></div>
              </div>

              <div className={`wizard-form ${stage === 1 ? '' : 'hidden'}`} id="stepOneForm">
                <div className="field">
                  <label htmlFor="classGroup">Device class group</label>
                  <select id="classGroup" value={classGroup} onChange={(event) => setClassGroup(event.target.value)}>
                    {CLASS_GROUPS.map((group) => <option key={group} value={group}>{group}</option>)}
                  </select>
                </div>
                <div className="field">
                  <label htmlFor="adminPasscode">Admin passcode</label>
                  <input id="adminPasscode" type="password" autoComplete="current-password" placeholder="Enter admin passcode" value={adminPasscode} onChange={(event) => setAdminPasscode(event.target.value)} />
                  <div className="field-error" id="formError">{formError}</div>
                </div>
                <div className="step-actions">
                  <button className="btn btn-primary" id="generateButton" type="button" onClick={() => generateToken(false)}>Generate QR Code</button>
                </div>
              </div>

              <div className={`qr-wrap ${stage === 2 ? '' : 'hidden'}`} id="qrStep">
                <div className="qr-card">
                  <div className="qr-card__frame" id="qrCode" aria-label="Generated QR code">
                    {qrSrc ? <img src={qrSrc} alt="Generated QR code" /> : <span>QR library failed to load.</span>}
                  </div>
                </div>
                <div className="qr-meta">
                  <div className="note-box">This QR code expires in 60 seconds and is single-use.</div>
                  <div className="helper-text">Signed enrollment token</div>
                  <code id="tokenOutput">{token}</code>
                  <div className="step-actions">
                    <button className="btn btn-outline" id="regenerateButton" type="button" onClick={() => generateToken(false)}>Regenerate QR</button>
                    <button className="btn btn-primary" id="confirmButton" type="button" onClick={finalizeEnrollment}>Mark Device as Pending</button>
                  </div>
                </div>
              </div>

              <div className={stage === 3 ? '' : 'hidden'} id="stepThreeState">
                <div className="note-box note-box--spaced">Enrollment confirmed. The device now appears in the pending list below.</div>
                <div className="pending-list" id="pendingList">
                  {pending.slice().reverse().map((item) => (
                    <article className="pending-item" key={`${item.group}-${item.token}`}>
                      <div>
                        <strong>{item.group}</strong>
                        <span>Token used: {item.token}</span>
                      </div>
                      <span className="badge badge--pending">Pending approval</span>
                    </article>
                  ))}
                </div>
              </div>
            </section>
          </div>
        </section>
      </main>
    </>
  );
}

EnrollmentPage.propTypes = {};

export default EnrollmentPage;
