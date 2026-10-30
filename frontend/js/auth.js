/**
 * STMS - Authentication & Role Permissions Management
 */

const auth = {
  getUser() {
    try {
      const userStr = localStorage.getItem('stms_user') || sessionStorage.getItem('stms_user');
      return userStr ? JSON.parse(userStr) : null;
    } catch {
      return null;
    }
  },

  getToken() {
    return localStorage.getItem('stms_token') || sessionStorage.getItem('stms_token');
  },

  isAuthenticated() {
    return !!this.getToken() && !!this.getUser();
  },

  hasRole(...allowedRoles) {
    const user = this.getUser();
    if (!user || !user.role) return false;
    return allowedRoles.includes(user.role);
  },

  async login(email, password, remember = true) {
    const res = await api.post('/auth/login', { email, password });
    if (res.success && res.token && res.user) {
      const storage = remember ? localStorage : sessionStorage;
      storage.setItem('stms_token', res.token);
      storage.setItem('stms_user', JSON.stringify(res.user));
      return res;
    }
    throw new Error(res.message || 'Login failed.');
  },

  async register(name, email, password, role = 'officer', remember = true) {
    const res = await api.post('/auth/register', { name, email, password, role });
    if (res.success && res.token && res.user) {
      const storage = remember ? localStorage : sessionStorage;
      storage.setItem('stms_token', res.token);
      storage.setItem('stms_user', JSON.stringify(res.user));
      return res;
    }
    throw new Error(res.message || 'Registration failed.');
  },

  async quickSwitch(email, password) {
    try {
      showToast(`Authenticating as ${email}...`, 'info', 2000);
      await this.login(email, password, true);
      showToast('Switched account successfully!', 'success', 2000);
      setTimeout(() => {
        window.location.reload();
      }, 500);
    } catch (err) {
      showToast(err.message || 'Switch failed', 'error');
    }
  },

  async logout() {
    try {
      await api.post('/auth/logout', {});
    } catch {
      // Ignore network failure on logout
    } finally {
      localStorage.removeItem('stms_token');
      sessionStorage.removeItem('stms_token');
      localStorage.removeItem('stms_user');
      sessionStorage.removeItem('stms_user');
      window.location.href = '/login.html';
    }
  },

  checkSession() {
    const isLoginPage = window.location.pathname.includes('login.html');
    const user = this.getUser();

    if (!user || !this.getToken()) {
      if (!isLoginPage) {
        window.location.href = '/login.html';
      }
    } else {
      if (isLoginPage) {
        window.location.href = '/index.html';
      } else {
        this.applyUserInterfaceRoles(user);
      }
    }
  },

  applyUserInterfaceRoles(user) {
    // Update user profile display elements
    const nameEl = document.getElementById('user-display-name');
    const roleEl = document.getElementById('user-display-role');
    const roleBadgeEl = document.getElementById('user-role-badge');

    if (nameEl) nameEl.textContent = user.name;
    if (roleEl) roleEl.textContent = user.email;
    if (roleBadgeEl) {
      const roleLabels = {
        admin: 'System Admin',
        traffic_admin: 'Traffic Admin',
        officer: 'Traffic Officer'
      };
      roleBadgeEl.textContent = roleLabels[user.role] || user.role;
      roleBadgeEl.className = `badge badge-${user.role === 'admin' ? 'emergency' : user.role === 'traffic_admin' ? 'moderate' : 'normal'}`;
    }

    // Role-based visibility
    const adminOnlyElements = document.querySelectorAll('.role-admin-only');
    adminOnlyElements.forEach(el => {
      el.style.display = user.role === 'admin' ? '' : 'none';
    });

    const trafficAdminElements = document.querySelectorAll('.role-traffic-admin');
    trafficAdminElements.forEach(el => {
      el.style.display = (user.role === 'admin' || user.role === 'traffic_admin') ? '' : 'none';
    });
  }
};
