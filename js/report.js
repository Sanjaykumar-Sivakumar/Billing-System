/* ============================================================
   report.js — Revenue Reports, Top Lists, Charts
   ============================================================ */

const Report = {
  render() {
    const main = document.getElementById('mainContent');
    const invoices = Storage.getAll(DB_KEYS.INVOICES);

    const today = invoices.filter(i => Utils.isToday(i.date)).reduce((s, i) => s + i.grandTotal, 0);
    const week = invoices.filter(i => Utils.isThisWeek(i.date)).reduce((s, i) => s + i.grandTotal, 0);
    const month = invoices.filter(i => Utils.isThisMonth(i.date)).reduce((s, i) => s + i.grandTotal, 0);
    const year = invoices.filter(i => Utils.isThisYear(i.date)).reduce((s, i) => s + i.grandTotal, 0);

    main.innerHTML = `
      <div class="page-header">
        <div><h1>Reports</h1><p class="page-sub">Revenue analytics</p></div>
      </div>
      <div class="stat-grid">
        <div class="stat-card glass"><div class="stat-icon" style="background:var(--accent-orange-soft)">📅</div><div class="stat-info"><span class="stat-label">Today</span><span class="stat-value">${Utils.formatCurrency(today)}</span></div></div>
        <div class="stat-card glass"><div class="stat-icon" style="background:var(--accent-blue-soft)">🗓️</div><div class="stat-info"><span class="stat-label">This Week</span><span class="stat-value">${Utils.formatCurrency(week)}</span></div></div>
        <div class="stat-card glass"><div class="stat-icon" style="background:var(--accent-orange-soft)">📆</div><div class="stat-info"><span class="stat-label">This Month</span><span class="stat-value">${Utils.formatCurrency(month)}</span></div></div>
        <div class="stat-card glass"><div class="stat-icon" style="background:var(--accent-blue-soft)">📊</div><div class="stat-info"><span class="stat-label">This Year</span><span class="stat-value">${Utils.formatCurrency(year)}</span></div></div>
      </div>

      <div class="dash-grid">
        <div class="card glass">
          <h3>📈 Last 7 Days Revenue</h3>
          <canvas id="revenueChart" height="220"></canvas>
        </div>
        <div class="card glass">
          <h3>🏆 Top Customers</h3>
          ${this.topCustomersHtml(invoices)}
        </div>
      </div>

      <div class="dash-grid">
        <div class="card glass">
          <h3>🔧 Top Selling Spare Parts</h3>
          ${this.topPartsHtml(invoices)}
        </div>
        <div class="card glass">
          <h3>🏍️ Most Frequent Bikes</h3>
          ${this.topBikesHtml(invoices)}
        </div>
      </div>
    `;

    this.drawChart(invoices);
  },

  topCustomersHtml(invoices) {
    const map = {};
    invoices.forEach(i => {
      map[i.customerName] = (map[i.customerName] || 0) + i.grandTotal;
    });
    const top = Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 5);
    if (top.length === 0) return '<p class="empty-msg">No data yet</p>';
    return `<ul class="rank-list">${top.map(([name, amt], idx) => `<li><span class="rank-no">${idx + 1}</span><span class="rank-name">${Utils.escapeHtml(name)}</span><span class="rank-val">${Utils.formatCurrency(amt)}</span></li>`).join('')}</ul>`;
  },

  topPartsHtml(invoices) {
    const map = {};
    invoices.forEach(i => (i.parts || []).forEach(p => { map[p.name] = (map[p.name] || 0) + p.qty; }));
    const top = Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 5);
    if (top.length === 0) return '<p class="empty-msg">No data yet</p>';
    return `<ul class="rank-list">${top.map(([name, qty], idx) => `<li><span class="rank-no">${idx + 1}</span><span class="rank-name">${Utils.escapeHtml(name)}</span><span class="rank-val">${qty} units</span></li>`).join('')}</ul>`;
  },

  topBikesHtml(invoices) {
    const map = {};
    invoices.forEach(i => { map[i.bikeNumber] = (map[i.bikeNumber] || 0) + 1; });
    const top = Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 5);
    if (top.length === 0) return '<p class="empty-msg">No data yet</p>';
    return `<ul class="rank-list">${top.map(([name, count], idx) => `<li><span class="rank-no">${idx + 1}</span><span class="rank-name">${Utils.escapeHtml(name)}</span><span class="rank-val">${count} visits</span></li>`).join('')}</ul>`;
  },

  drawChart(invoices) {
    const canvas = document.getElementById('revenueChart');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    const w = canvas.clientWidth, h = canvas.clientHeight || 220;
    canvas.width = w * dpr; canvas.height = h * dpr;
    ctx.scale(dpr, dpr);

    const days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i);
      days.push(d);
    }
    const values = days.map(d => {
      const iso = d.toISOString().slice(0, 10);
      return invoices.filter(inv => inv.date === iso).reduce((s, inv) => s + inv.grandTotal, 0);
    });
    const max = Math.max(...values, 1);
    const padding = 30;
    const barW = (w - padding * 2) / days.length * 0.6;
    const gap = (w - padding * 2) / days.length;

    const styles = getComputedStyle(document.documentElement);
    const blue = styles.getPropertyValue('--accent-blue').trim() || '#3B5BFE';
    const orange = styles.getPropertyValue('--accent-orange').trim() || '#FF8A3D';
    const text = styles.getPropertyValue('--text-secondary').trim() || '#666';

    ctx.clearRect(0, 0, w, h);
    days.forEach((d, i) => {
      const barH = (values[i] / max) * (h - padding - 20);
      const x = padding + i * gap + (gap - barW) / 2;
      const y = h - padding - barH;
      const grad = ctx.createLinearGradient(0, y, 0, h - padding);
      grad.addColorStop(0, orange);
      grad.addColorStop(1, blue);
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.roundRect ? ctx.roundRect(x, y, barW, barH, 6) : ctx.rect(x, y, barW, barH);
      ctx.fill();

      ctx.fillStyle = text;
      ctx.font = '11px Poppins, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(d.toLocaleDateString('en-IN', { weekday: 'short' }), x + barW / 2, h - 10);
    });
  }
};

window.Report = Report;
