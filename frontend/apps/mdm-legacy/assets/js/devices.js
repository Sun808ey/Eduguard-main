import { DEVICE_CLASS_OPTIONS, DEVICE_STATUS_OPTIONS, DEVICES } from './mock-data.js';

const STATE = {
  search: '',
  classFilter: 'All Classes',
  statusFilter: 'All Statuses',
  complianceFilter: 'All Compliance',
  sortKey: 'lastSync',
  sortDir: 'desc',
  page: 1,
  pageSize: 10,
};

function qs(selector, root = document) {
  return root.querySelector(selector);
}

function qsa(selector, root = document) {
  return Array.from(root.querySelectorAll(selector));
}

function formatRelativeTime(isoString) {
  const diffMs = Date.now() - new Date(isoString).getTime();
  const minutes = Math.max(1, Math.round(diffMs / 60000));
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} hr ago`;
  const days = Math.round(hours / 24);
  return `${days} day${days > 1 ? 's' : ''} ago`;
}

function truncateText(value, length = 18) {
  return value.length > length ? `${value.slice(0, length)}…` : value;
}

function formatBatteryClass(value) {
  return value < 30 ? 'battery-meter__fill--low' : '';
}

function getFilteredDevices() {
  const searchTerm = STATE.search.trim().toLowerCase();
  let rows = [...DEVICES];

  if (searchTerm) {
    rows = rows.filter((device) => {
      return [device.model, device.id, device.classGroup, device.status, device.compliance, device.district, device.policy]
        .join(' ')
        .toLowerCase()
        .includes(searchTerm);
    });
  }

  if (STATE.classFilter !== 'All Classes') {
    rows = rows.filter((device) => device.classGroup === STATE.classFilter);
  }

  if (STATE.statusFilter !== 'All Statuses') {
    rows = rows.filter((device) => device.status === STATE.statusFilter);
  }

  if (STATE.complianceFilter !== 'All Compliance') {
    rows = rows.filter((device) => device.compliance === STATE.complianceFilter);
  }

  rows.sort((a, b) => {
    const left = a[STATE.sortKey];
    const right = b[STATE.sortKey];
    if (typeof left === 'number' && typeof right === 'number') {
      return STATE.sortDir === 'asc' ? left - right : right - left;
    }
    return STATE.sortDir === 'asc'
      ? String(left).localeCompare(String(right))
      : String(right).localeCompare(String(left));
  });

  return rows;
}

function renderOptions(select, items, selectedValue) {
  select.innerHTML = items.map((item) => `<option value="${item}" ${item === selectedValue ? 'selected' : ''}>${item}</option>`).join('');
}

function getSeverityClass(compliance) {
  if (compliance === 'Violation') return 'severity-high';
  if (compliance === 'Pending') return 'severity-med';
  return 'severity-low';
}

function renderTable(container, rows, openDevice, confirmWipe, setMessage) {
  const pageStart = (STATE.page - 1) * STATE.pageSize;
  const pageRows = rows.slice(pageStart, pageStart + STATE.pageSize);

  if (!rows.length) {
    container.innerHTML = '<p class="muted">No devices match the current filters.</p>';
    return;
  }

  container.innerHTML = `
    <table class="device-table" aria-label="Enrolled devices">
      <thead>
        <tr>
          <th data-sort-key="model">Device</th>
          <th data-sort-key="classGroup">Class</th>
          <th data-sort-key="status">Status</th>
          <th data-sort-key="compliance">Compliance</th>
          <th data-sort-key="battery">Battery</th>
          <th data-sort-key="lastSync">Last Sync</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        ${pageRows.map((device) => `
          <tr>
            <td>
              <div class="device-table__model">${device.model}</div>
              <div class="device-table__sub">${device.id} • ${device.district}</div>
            </td>
            <td>${device.classGroup}</td>
            <td><span class="badge badge--${device.status.toLowerCase() === 'offline' ? 'offline' : device.status.toLowerCase() === 'syncing' ? 'syncing' : 'online'}">${device.status}</span></td>
            <td><span class="${getSeverityClass(device.compliance)}">${device.compliance}</span></td>
            <td>
              <div class="battery-meter" aria-label="${device.battery}% battery">
                <div class="battery-meter__fill ${formatBatteryClass(device.battery)}" style="width:${device.battery}%"></div>
              </div>
            </td>
            <td>${formatRelativeTime(device.lastSync)}</td>
            <td>
              <div class="device-actions">
                <button class="btn btn-ghost" type="button" data-device-action="view" data-device-id="${device.id}">View</button>
                <button class="btn btn-ghost" type="button" data-device-action="push" data-device-id="${device.id}">Push Policy</button>
                <button class="btn btn-ghost" type="button" data-device-action="lock" data-device-id="${device.id}">Lock</button>
                <button class="btn btn-ghost" type="button" data-device-action="sync" data-device-id="${device.id}">Force Sync</button>
                <button class="btn btn-danger" type="button" data-device-action="wipe" data-device-id="${device.id}">Wipe</button>
                <button class="btn btn-ghost" type="button" data-device-action="alert" data-device-id="${device.id}">Alert</button>
              </div>
            </td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;

  container.querySelectorAll('[data-sort-key]').forEach((th) => {
    th.addEventListener('click', () => {
      const key = th.dataset.sortKey;
      if (STATE.sortKey === key) {
        STATE.sortDir = STATE.sortDir === 'asc' ? 'desc' : 'asc';
      } else {
        STATE.sortKey = key;
        STATE.sortDir = key === 'lastSync' || key === 'battery' ? 'desc' : 'asc';
      }
      STATE.page = 1;
      render();
    });
  });

  container.querySelectorAll('[data-device-action]').forEach((button) => {
    button.addEventListener('click', () => {
      const device = DEVICES.find((row) => row.id === button.dataset.deviceId);
      if (!device) return;

      const action = button.dataset.deviceAction;
      if (action === 'view') {
        openDevice(device);
        return;
      }

      if (action === 'wipe') {
        confirmWipe(device);
        return;
      }

      const messages = {
        push: `Policy push queued for ${device.model} (${device.id}).`,
        lock: `Lock command sent to ${device.model} (${device.id}).`,
        sync: `Force sync requested for ${device.model} (${device.id}).`,
        alert: `Alert sent for ${device.model} (${device.id}).`,
      };
      setMessage(messages[action] || 'Action completed.');
    });
  });
}

function renderPagination(container, totalRows, onNavigate) {
  const totalPages = Math.max(1, Math.ceil(totalRows / STATE.pageSize));
  const buttons = [];
  for (let page = 1; page <= totalPages; page += 1) {
    buttons.push(`<button class="btn btn-ghost" type="button" data-page="${page}" ${page === STATE.page ? 'aria-current="page"' : ''}>${page}</button>`);
  }

  container.innerHTML = `
    <div class="pagination-bar__meta">Showing ${Math.min((STATE.page - 1) * STATE.pageSize + 1, totalRows)}-${Math.min(STATE.page * STATE.pageSize, totalRows)} of ${totalRows} devices</div>
    <div class="pagination-controls">${buttons.join('')}</div>
  `;

  container.querySelectorAll('[data-page]').forEach((button) => {
    button.addEventListener('click', () => {
      STATE.page = Number(button.dataset.page);
      onNavigate();
    });
  });
}

function openModal(modal, bodyHtml) {
  const body = modal.querySelector('[data-device-modal-body]');
  if (body) body.innerHTML = bodyHtml;
  modal.hidden = false;
}

function closeModal(modal) {
  modal.hidden = true;
}

export function initDevicesSection() {
  const searchInput = qs('[data-device-search]');
  const classFilter = qs('[data-filter-class]');
  const statusFilter = qs('[data-filter-status]');
  const complianceFilter = qs('[data-filter-compliance]');
  const tableContainer = qs('[data-device-table]');
  const paginationContainer = qs('[data-device-pagination]');
  const messageNode = qs('[data-device-message]');
  const exportButton = qs('[data-export-csv]');
  const enrollButton = qs('[data-enroll-open]');
  const enrollModal = qs('[data-enroll-modal]');
  const deviceModal = qs('[data-device-modal]');
  const confirmModal = qs('[data-confirm-modal]');
  const confirmMessage = qs('[data-confirm-message]');
  const confirmAccept = qs('[data-confirm-accept]');
  const closeDeviceModal = qs('[data-device-modal-close]');
  const closeConfirmModal = qs('[data-confirm-close]');
  const cancelConfirm = qs('[data-confirm-cancel]');
  const closeEnrollModal = qs('[data-enroll-close]');

  if (!searchInput || !classFilter || !statusFilter || !complianceFilter || !tableContainer || !paginationContainer) {
    return;
  }

  let pendingWipeDevice = null;

  function setMessage(text) {
    if (messageNode) messageNode.textContent = text;
  }

  function openDevice(device) {
    openModal(deviceModal, `
      <div class="device-detail-grid">
        <div class="device-detail-item"><span>Device</span><strong>${device.model}</strong></div>
        <div class="device-detail-item"><span>Device ID</span><strong>${device.id}</strong></div>
        <div class="device-detail-item"><span>Class</span><strong>${device.classGroup}</strong></div>
        <div class="device-detail-item"><span>District</span><strong>${device.district}</strong></div>
        <div class="device-detail-item"><span>Status</span><strong>${device.status}</strong></div>
        <div class="device-detail-item"><span>Compliance</span><strong>${device.compliance}</strong></div>
        <div class="device-detail-item"><span>Battery</span><strong>${device.battery}%</strong></div>
        <div class="device-detail-item"><span>Last Sync</span><strong>${formatRelativeTime(device.lastSync)}</strong></div>
        <div class="device-detail-item"><span>Policy</span><strong>${device.policy}</strong></div>
        <div class="device-detail-item"><span>Enrolled By</span><strong>${device.enrolledBy}</strong></div>
      </div>
    `);
  }

  function confirmWipe(device) {
    pendingWipeDevice = device;
    confirmMessage.textContent = `Confirm wipe for ${device.model} (${device.id})? This mock action clears local enrollment state only.`;
    confirmModal.hidden = false;
  }

  function render() {
    const filtered = getFilteredDevices();
    const totalPages = Math.max(1, Math.ceil(filtered.length / STATE.pageSize));
    if (STATE.page > totalPages) STATE.page = totalPages;
    renderTable(tableContainer, filtered, openDevice, confirmWipe, setMessage);
    renderPagination(paginationContainer, filtered.length, render);
  }

  renderOptions(classFilter, DEVICE_CLASS_OPTIONS, STATE.classFilter);
  renderOptions(statusFilter, DEVICE_STATUS_OPTIONS, STATE.statusFilter);
  renderOptions(complianceFilter, ['All Compliance', 'Compliant', 'Pending', 'Violation'], STATE.complianceFilter);

  searchInput.addEventListener('input', () => {
    STATE.search = searchInput.value;
    STATE.page = 1;
    render();
  });

  classFilter.addEventListener('change', () => {
    STATE.classFilter = classFilter.value;
    STATE.page = 1;
    render();
  });

  statusFilter.addEventListener('change', () => {
    STATE.statusFilter = statusFilter.value;
    STATE.page = 1;
    render();
  });

  complianceFilter.addEventListener('change', () => {
    STATE.complianceFilter = complianceFilter.value;
    STATE.page = 1;
    render();
  });

  if (exportButton) {
    exportButton.addEventListener('click', () => {
      const header = ['id,model,classGroup,status,compliance,battery,lastSync,policy,enrolledBy,district'];
      const rows = DEVICES.map((device) => [
        device.id, device.model, device.classGroup, device.status, device.compliance, device.battery, device.lastSync, device.policy, device.enrolledBy, device.district,
      ].map((value) => `"${String(value).replace(/"/g, '""')}"`).join(','));
      const blob = new Blob([`${header.join('\n')}\n${rows.join('\n')}`], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'eduguard-devices.csv';
      link.click();
      URL.revokeObjectURL(url);
      setMessage('Device CSV export started.');
    });
  }

  if (enrollButton && enrollModal) {
    enrollButton.addEventListener('click', () => { enrollModal.hidden = false; });
  }

  if (closeEnrollModal && enrollModal) closeEnrollModal.addEventListener('click', () => { enrollModal.hidden = true; });
  if (closeDeviceModal && deviceModal) closeDeviceModal.addEventListener('click', () => { deviceModal.hidden = true; });
  if (closeConfirmModal && confirmModal) closeConfirmModal.addEventListener('click', () => { confirmModal.hidden = true; });
  if (cancelConfirm && confirmModal) cancelConfirm.addEventListener('click', () => { confirmModal.hidden = true; });

  if (confirmAccept && confirmModal) {
    confirmAccept.addEventListener('click', () => {
      if (pendingWipeDevice) {
        setMessage(`Wipe confirmed for ${pendingWipeDevice.model} (${pendingWipeDevice.id}).`);
      }
      pendingWipeDevice = null;
      confirmModal.hidden = true;
    });
  }

  [deviceModal, confirmModal, enrollModal].forEach((modal) => {
    if (!modal) return;
    modal.addEventListener('click', (event) => {
      if (event.target === modal) modal.hidden = true;
    });
  });

  render();
}
