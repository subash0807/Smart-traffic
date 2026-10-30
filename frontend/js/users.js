/**
 * STMS - User Accounts & Access Control Module (Administrator Only)
 */

async function initUsers() {
  await loadUsersList();
}

async function loadUsersList() {
  const container = document.getElementById('users-table-body');
  if (!container) return;

  try {
    const res = await api.get('/users');
    const users = res.data || [];

    if (users.length === 0) {
      container.innerHTML = '<tr><td colspan="6" style="text-align: center; color: var(--text-muted); padding: 18px;">No users found.</td></tr>';
      return;
    }

    container.innerHTML = users.map(u => {
      const roleBadge = u.role === 'admin' ? 'badge-emergency' : u.role === 'traffic_admin' ? 'badge-moderate' : 'badge-normal';
      const roleName = u.role === 'admin' ? 'System Administrator' : u.role === 'traffic_admin' ? 'Traffic Administrator' : 'Traffic Officer';

      return `
        <tr>
          <td><strong>${escapeHtml(u.name)}</strong></td>
          <td>${escapeHtml(u.email)}</td>
          <td><span class="badge ${roleBadge}">${roleName}</span></td>
          <td><span class="badge ${u.active ? 'badge-normal' : 'badge-secondary'}">${u.active ? 'ACTIVE' : 'DEACTIVATED'}</span></td>
          <td style="font-size: 0.775rem; color: var(--text-muted);">${new Date(u.createdAt).toLocaleDateString()}</td>
          <td>
            <div style="display: flex; gap: 6px;">
              <button class="btn btn-outline btn-sm" onclick="toggleUserActive('${u._id}', ${u.active})">
                ${u.active ? 'Deactivate' : 'Activate'}
              </button>
              <button class="btn btn-danger btn-sm" onclick="confirmDeleteUser('${u._id}', '${escapeHtml(u.name)}')">
                Delete
              </button>
            </div>
          </td>
        </tr>
      `;
    }).join('');
  } catch (err) {
    container.innerHTML = `<tr><td colspan="6" style="text-align: center; color: var(--status-severe); padding: 18px;">Failed to load users: ${err.message}</td></tr>`;
  }
}

function openCreateUserModal() {
  document.getElementById('modal-user').classList.add('active');
}

function closeCreateUserModal() {
  document.getElementById('modal-user').classList.remove('active');
}

async function handleCreateUser(e) {
  e.preventDefault();
  const name = document.getElementById('new-user-name').value.trim();
  const email = document.getElementById('new-user-email').value.trim();
  const password = document.getElementById('new-user-pwd').value;
  const role = document.getElementById('new-user-role').value;

  try {
    await api.post('/users', { name, email, password, role, active: true });
    showToast(`User account created for ${name}.`, 'success');
    closeCreateUserModal();
    loadUsersList();
  } catch (err) {
    showToast(err.message || 'Failed to create user', 'error');
  }
}

async function toggleUserActive(id, currentActive) {
  try {
    await api.put(`/users/${id}`, { active: !currentActive });
    showToast(`Account status updated to ${!currentActive ? 'ACTIVE' : 'DEACTIVATED'}.`, 'info');
    loadUsersList();
  } catch (err) {
    showToast(err.message || 'Status update failed', 'error');
  }
}

async function confirmDeleteUser(id, name) {
  if (confirm(`Are you sure you want to permanently delete user account "${name}"?`)) {
    try {
      await api.delete(`/users/${id}`);
      showToast(`User account "${name}" removed.`, 'success');
      loadUsersList();
    } catch (err) {
      showToast(err.message || 'Failed to delete user', 'error');
    }
  }
}
