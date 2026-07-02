import { POLICIES, POLICY_TYPES } from './mock-data.js';

const STATE = {
  expandedId: 'POL-001',
};

function qs(selector, root = document) {
  return root.querySelector(selector);
}

function qsa(selector, root = document) {
  return Array.from(root.querySelectorAll(selector));
}

function renderPolicyCard(policy) {
  const isExpanded = STATE.expandedId === policy.id;
  return `
    <article class="policy-card ${isExpanded ? 'policy-card--expanded' : ''}" data-policy-id="${policy.id}">
      <button class="policy-card__toggle" type="button" data-policy-toggle="${policy.id}" aria-expanded="${isExpanded ? 'true' : 'false'}">
        <div class="policy-card__header">
          <div>
            <h3>${policy.title}</h3>
            <p>${policy.summary}</p>
          </div>
          <span class="status-pill status-pill--${policy.status.toLowerCase()}">${policy.status}</span>
        </div>
        <div class="policy-card__meta">
          <span class="chip">${policy.scope}</span>
          <span class="chip">${policy.type}</span>
          <span class="encryption-badge">${policy.encryption}</span>
        </div>
      </button>
      <div class="policy-card__details" ${isExpanded ? '' : 'hidden'}>
        <ul>
          ${policy.details.map((item) => `<li>${item}</li>`).join('')}
        </ul>
        <div class="policy-card__footer">
          <span>Updated ${policy.updatedAt}</span>
          <span>${policy.id}</span>
        </div>
      </div>
    </article>
  `;
}

function openModal(modal) {
  modal.hidden = false;
}

function closeModal(modal) {
  modal.hidden = true;
}

function setMessage(node, text) {
  if (node) node.textContent = text;
}

function populatePolicyTypes(select) {
  if (!select) return;
  select.innerHTML = POLICY_TYPES.map((type) => `<option value="${type}">${type}</option>`).join('');
}

export function initPoliciesSection() {
  const container = qs('[data-policies-grid]');
  const createButton = qs('[data-policy-create-open]');
  const createModal = qs('[data-policy-create-modal]');
  const closeCreate = qs('[data-policy-create-close]');
  const cancelCreate = qs('[data-policy-create-cancel]');
  const form = qs('[data-policy-form]');
  const messageNode = qs('[data-policy-message]');
  const typeSelect = qs('[data-policy-type]');
  const statusSelect = qs('[data-policy-status]');
  const scopeSelect = qs('[data-policy-scope]');

  if (!container || !createButton || !createModal || !form) return;

  function render() {
    container.innerHTML = POLICIES.map(renderPolicyCard).join('');

    qsa('[data-policy-toggle]', container).forEach((button) => {
      button.addEventListener('click', () => {
        const policyId = button.dataset.policyToggle;
        STATE.expandedId = STATE.expandedId === policyId ? '' : policyId;
        render();
      });
    });
  }

  if (typeSelect) populatePolicyTypes(typeSelect);
  if (statusSelect) statusSelect.innerHTML = ['Active', 'Scheduled', 'Draft', 'Inactive'].map((item) => `<option value="${item}">${item}</option>`).join('');
  if (scopeSelect) scopeSelect.innerHTML = ['All Classes', 'S.1', 'S.2', 'S.3', 'S.4', 'S.5', 'S.6'].map((item) => `<option value="${item}">${item}</option>`).join('');

  createButton.addEventListener('click', () => openModal(createModal));
  if (closeCreate) closeCreate.addEventListener('click', () => closeModal(createModal));
  if (cancelCreate) cancelCreate.addEventListener('click', () => closeModal(createModal));
  createModal.addEventListener('click', (event) => {
    if (event.target === createModal) closeModal(createModal);
  });

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    setMessage(messageNode, 'Policy editor saved locally. The mock policy remains in draft mode for now.');
    closeModal(createModal);
    form.reset();
    if (typeSelect) populatePolicyTypes(typeSelect);
  });

  render();
}
