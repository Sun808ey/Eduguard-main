// QR enrollment wizard for EduGuard system.
(function () {
  const body = document.body;
  if (!body || !body.classList.contains('enrollment-page')) return;

  const classGroup = document.getElementById('classGroup');
  const adminPasscode = document.getElementById('adminPasscode');
  const formError = document.getElementById('formError');
  const generateButton = document.getElementById('generateButton');
  const regenerateButton = document.getElementById('regenerateButton');
  const confirmButton = document.getElementById('confirmButton');
  const qrStep = document.getElementById('qrStep');
  const stepOneForm = document.getElementById('stepOneForm');
  const stepThreeState = document.getElementById('stepThreeState');
  const qrCode = document.getElementById('qrCode');
  const tokenOutput = document.getElementById('tokenOutput');
  const stageTitle = document.getElementById('stageTitle');
  const stageCopy = document.getElementById('stageCopy');
  const countdownValue = document.getElementById('countdownValue');
  const pendingList = document.getElementById('pendingList');
  const toastRoot = document.getElementById('toastRoot');
  const stepCards = Array.from(document.querySelectorAll('[data-step-card]'));

  const tokenState = {
    token: '',
    classGroup: '',
    expiresAt: 0,
    intervalId: null,
    countdownId: null,
    pending: [],
  };

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

  function updateStep(step) {
    stepCards.forEach((card) => {
      card.classList.toggle('is-active', Number(card.dataset.stepCard) === step);
    });
    if (step === 1) {
      stageTitle.textContent = 'Step 1: Device details';
      stageCopy.textContent = 'Enter the device class group and the admin passcode to generate a QR enrollment token.';
      stepOneForm.classList.remove('hidden');
      qrStep.classList.add('hidden');
      stepThreeState.classList.add('hidden');
    } else if (step === 2) {
      stageTitle.textContent = 'Step 2: Generated QR code';
      stageCopy.textContent = 'Scan the generated QR code on the device to complete enrollment.';
      stepOneForm.classList.add('hidden');
      qrStep.classList.remove('hidden');
      stepThreeState.classList.add('hidden');
    } else {
      stageTitle.textContent = 'Step 3: Confirmation';
      stageCopy.textContent = 'The device is now in the pending list and ready for policy sync.';
      stepOneForm.classList.add('hidden');
      qrStep.classList.add('hidden');
      stepThreeState.classList.remove('hidden');
    }
  }

  function showToast(message) {
    if (!toastRoot) return;
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;
    toastRoot.appendChild(toast);
    window.setTimeout(() => toast.remove(), 2500);
  }

  function renderPendingList() {
    pendingList.innerHTML = '';

    tokenState.pending.slice().reverse().forEach((item) => {
      const row = document.createElement('article');
      row.className = 'pending-item';
      row.innerHTML = `
        <div>
          <strong>${item.group}</strong>
          <span>Token used: ${item.token}</span>
        </div>
        <span class="badge badge--pending">Pending approval</span>
      `;
      pendingList.appendChild(row);
    });
  }

  function clearTimers() {
    if (tokenState.intervalId) window.clearInterval(tokenState.intervalId);
    if (tokenState.countdownId) window.clearInterval(tokenState.countdownId);
    tokenState.intervalId = null;
    tokenState.countdownId = null;
  }

  function updateCountdown() {
    const remaining = Math.max(0, Math.ceil((tokenState.expiresAt - Date.now()) / 1000));
    countdownValue.textContent = `${remaining}s`;
    if (remaining <= 0) {
      regenerateToken(true);
    }
  }

  function drawQr(token) {
    if (!window.QRCode) {
      qrCode.textContent = 'QR library failed to load.';
      return;
    }
    qrCode.innerHTML = '';
    // The QR code encodes the mock signed enrollment token for the device.
    new QRCode(qrCode, {
      text: token,
      width: 240,
      height: 240,
      colorDark: '#07111A',
      colorLight: '#ffffff',
      correctLevel: QRCode.CorrectLevel.M,
    });
  }

  function regenerateToken(silent = false) {
    const group = classGroup.value;
    const passcode = adminPasscode.value.trim();

    if (!passcode) {
      formError.textContent = 'Enter the admin passcode before generating the QR code.';
      return;
    }

    formError.textContent = '';
    tokenState.classGroup = group;
    tokenState.token = createSignedToken(group, passcode);
    tokenState.expiresAt = Date.now() + 60000;

    drawQr(tokenState.token);
    tokenOutput.textContent = tokenState.token;
    updateCountdown();
    updateStep(2);

    clearTimers();
    tokenState.countdownId = window.setInterval(updateCountdown, 1000);
    tokenState.intervalId = window.setInterval(() => regenerateToken(true), 60000);

    if (!silent) {
      showToast('QR code generated');
    }
  }

  function finalizeEnrollment() {
    if (!tokenState.token) return;

    tokenState.pending.push({
      group: tokenState.classGroup,
      token: `${tokenState.token.slice(0, 12)}…`,
    });

    renderPendingList();
    updateStep(3);
    showToast('Device added to pending list');
  }

  generateButton.addEventListener('click', () => regenerateToken(false));
  regenerateButton.addEventListener('click', () => regenerateToken(false));
  confirmButton.addEventListener('click', finalizeEnrollment);

  document.addEventListener('visibilitychange', () => {
    if (!document.hidden && tokenState.token) updateCountdown();
  });

  updateStep(1);
})();