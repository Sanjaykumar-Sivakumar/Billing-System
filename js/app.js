/* ============================================================
   app.js — Bootstrap, Login, Sidebar, Dashboard
   ============================================================ */

const App = {
  init() {
    Storage.seedIfEmpty();
    this.applyTheme(Storage.getTheme());
    this.bindLogin();
    this.bindShell();

    Router.register('login', () => {});
    Router.register('dashboard', () => Dashboard.render());
    Router.register('newbill', () => Billing.renderNew());
    Router.register('bills', () => Billing.renderHistory());
    Router.register('customers', () => Customer.renderList());
    Router.register('stock', () => Stock.renderList());
    Router.register('oil', () => Stock.renderOilList());
    Router.register('reports', () => Report.render());
    Router.register('settings', () => Settings.render());

    Router.init();
    this.renderTopbarInfo();
  },

  bindLogin() {
    const form = document.getElementById('loginForm');
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const u = document.getElementById('loginUser').value.trim();
      const p = document.getElementById('loginPass').value.trim();
      const remember = document.getElementById('loginRemember').checked;
      const settings = Storage.getSettings();
      if (u === settings.username && p === settings.password) {
        Storage.setSession({ user: u, at: Date.now(), remember });
        Utils.toast('Welcome, ' + settings.ownerName + '!', 'success');
        Router.navigate('dashboard');
        this.renderTopbarInfo();
      } else {
        Utils.toast('Incorrect username or password', 'error');
        document.getElementById('loginBox').classList.add('shake');
        setTimeout(() => document.getElementById('loginBox').classList.remove('shake'), 500);
      }
    });

    // Prefill remembered username
    const settings = Storage.getSettings();
    document.getElementById('loginUser').value = settings.username || '';
  },

  bindShell() {
    document.getElementById('menuToggle').addEventListener('click', () => {
      document.getElementById('sidebar').classList.toggle('open');
    });
    document.getElementById('logoutBtn').addEventListener('click', async () => {
      const ok = await Utils.confirm('Are you sure you want to log out?', 'Logout');
      if (ok) {
        Storage.clearSession();
        Utils.toast('Logged out', 'info');
        Router.navigate('login');
      }
    });
    document.getElementById('themeToggle').addEventListener('click', () => {
      const cur = Storage.getTheme();
      const next = cur === 'dark' ? 'light' : 'dark';
      Storage.setTheme(next);
      this.applyTheme(next);
    });
    document.querySelectorAll('.nav-item').forEach(el => {
      el.addEventListener('click', (e) => {
        e.preventDefault();
        Router.navigate(el.dataset.route);
      });
    });
    document.getElementById('quickNewBillBtn').addEventListener('click', () => Router.navigate('newbill'));
  },

  applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    const icon = document.getElementById('themeToggle');
    if (icon) icon.textContent = theme === 'dark' ? '☀️' : '🌙';
  },

  renderTopbarInfo() {
    const s = Storage.getSettings();
    const nameEl = document.getElementById('topWorkshopName');
    if (nameEl) nameEl.textContent = s.workshopName || 'Siva Sakthi';
    const logoEl = document.getElementById('topLogo');
    if (logoEl) logoEl.src = s.logo || 'assets/logo-placeholder.svg';
  }
};

const Dashboard = {
  render() {
    const main = document.getElementById('mainContent');
    const invoices = Storage.getAll(DB_KEYS.INVOICES);
    const customers = Storage.getAll(DB_KEYS.CUSTOMERS);
    const vehicles = Storage.getAll(DB_KEYS.VEHICLES);
    const stock = Storage.getAll(DB_KEYS.STOCK);
    const oils = Storage.getAll(DB_KEYS.OILS);

    const todayInv = invoices.filter(i => Utils.isToday(i.date));
    const monthInv = invoices.filter(i => Utils.isThisMonth(i.date));
    const pending = invoices.filter(i => i.status === 'pending');
    const todayRevenue = todayInv.reduce((s, i) => s + (i.grandTotal || 0), 0);
    const monthRevenue = monthInv.reduce((s, i) => s + (i.grandTotal || 0), 0);

    main.innerHTML = `
      <div class="page-header">
        <div>
          <h1>Dashboard</h1>
          <p class="page-sub">Today's business summary</p>
        </div>
        <button class="btn btn-primary btn-lg ripple" id="dashNewBillBtn">➕ New Bill</button>
      </div>

      <div class="stat-grid">
        <div class="stat-card glass">
          <div class="stat-icon" style="background:var(--accent-orange-soft)">💰</div>
          <div class="stat-info"><span class="stat-label">Today's Revenue</span><span class="stat-value">${Utils.formatCurrency(todayRevenue)}</span></div>
        </div>
        <div class="stat-card glass">
          <div class="stat-icon" style="background:var(--accent-blue-soft)">🧾</div>
          <div class="stat-info"><span class="stat-label">Today's Bills</span><span class="stat-value">${todayInv.length}</span></div>
        </div>
        <div class="stat-card glass">
          <div class="stat-icon" style="background:var(--accent-orange-soft)">📅</div>
          <div class="stat-info"><span class="stat-label">Monthly Revenue</span><span class="stat-value">${Utils.formatCurrency(monthRevenue)}</span></div>
        </div>
        <div class="stat-card glass">
          <div class="stat-icon" style="background:var(--accent-red-soft)">⏳</div>
          <div class="stat-info"><span class="stat-label">Pending Bills</span><span class="stat-value">${pending.length}</span></div>
        </div>
        <div class="stat-card glass">
          <div class="stat-icon" style="background:var(--accent-blue-soft)">👥</div>
          <div class="stat-info"><span class="stat-label">Total Customers</span><span class="stat-value">${customers.length}</span></div>
        </div>
        <div class="stat-card glass">
          <div class="stat-icon" style="background:var(--accent-orange-soft)">🏍️</div>
          <div class="stat-info"><span class="stat-label">Total Vehicles</span><span class="stat-value">${vehicles.length}</span></div>
        </div>
      </div>

      <div class="dash-grid">
        <div class="card glass">
          <h3>📋 Master List Summary</h3>
          <ul class="low-stock-list">
            <li><span>🔧 Spare Part Names</span><span class="badge badge-success">${stock.length} entries</span></li>
            <li><span>🛢️ Engine Oil Brands</span><span class="badge badge-success">${oils.length} entries</span></li>
          </ul>
          <p class="hint-line">Prices are entered fresh on every bill — not stored permanently.</p>
        </div>
        <div class="card glass">
          <h3>⚡ Quick Actions</h3>
          <div class="quick-actions">
            <button class="qa-btn ripple" data-route="newbill">🧾<span>New Bill</span></button>
            <button class="qa-btn ripple" data-route="customers">👥<span>Customers</span></button>
            <button class="qa-btn ripple" data-route="stock">📦<span>Spare Parts</span></button>
            <button class="qa-btn ripple" data-route="reports">📊<span>Reports</span></button>
          </div>
        </div>
      </div>

      <div class="card glass">
        <h3>🕒 Recent Bills</h3>
        ${this.recentBillsTable(invoices)}
      </div>
    `;

    main.querySelector('#dashNewBillBtn').addEventListener('click', () => Router.navigate('newbill'));
    main.querySelectorAll('.qa-btn').forEach(b => b.addEventListener('click', () => Router.navigate(b.dataset.route)));
    main.querySelectorAll('.recent-view-btn').forEach(b => b.addEventListener('click', () => Billing.viewInvoice(b.dataset.id)));
  },

  recentBillsTable(invoices) {
    const recent = [...invoices].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 6);
    if (recent.length === 0) return '<p class="empty-msg">No bills yet. Create your first bill!</p>';
    return `
      <div class="table-wrap">
      <table class="data-table">
        <thead><tr><th>Invoice No</th><th>Customer</th><th>Bike No</th><th>Date</th><th>Amount</th><th></th></tr></thead>
        <tbody>
          ${recent.map(i => `
            <tr>
              <td>${Utils.escapeHtml(i.invoiceNo)}</td>
              <td>${Utils.escapeHtml(i.customerName)}</td>
              <td>${Utils.escapeHtml(i.bikeNumber)}</td>
              <td>${Utils.formatDate(i.date)}</td>
              <td>${Utils.formatCurrency(i.grandTotal)}</td>
              <td><button class="btn btn-sm btn-ghost recent-view-btn" data-id="${i.id}">View</button></td>
            </tr>
          `).join('')}
        </tbody>
      </table>
      </div>
    `;
  }
};

window.App = App;
window.Dashboard = Dashboard;

// Global ripple effect for any .ripple element
document.addEventListener('click', (e) => {
  const btn = e.target.closest('.ripple');
  if (!btn) return;
  const rect = btn.getBoundingClientRect();
  const circle = document.createElement('span');
  const size = Math.max(rect.width, rect.height);
  circle.className = 'ripple-circle';
  circle.style.width = circle.style.height = size + 'px';
  circle.style.left = (e.clientX - rect.left - size / 2) + 'px';
  circle.style.top = (e.clientY - rect.top - size / 2) + 'px';
  btn.appendChild(circle);
  setTimeout(() => circle.remove(), 500);
});

document.addEventListener('DOMContentLoaded', () => App.init());
