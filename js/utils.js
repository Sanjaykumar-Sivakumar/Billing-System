/* ============================================================
   utils.js — Shared helpers (toast, modal, formatting, validation)
   ============================================================ */

const Utils = {
  uid() {
    return 'id_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 9);
  },

  formatCurrency(n) {
    n = Number(n) || 0;
    return '₹' + n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  },

  formatDate(d) {
    if (!d) return '-';
    const date = new Date(d);
    if (isNaN(date)) return '-';
    return date.toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' });
  },

  formatDateTime(d) {
    const date = new Date(d);
    if (isNaN(date)) return '-';
    return date.toLocaleString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  },

  todayISO() {
    return new Date().toISOString().slice(0, 10);
  },

  isToday(d) {
    if (!d) return false;
    const a = new Date(d), b = new Date();
    return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
  },

  isThisMonth(d) {
    if (!d) return false;
    const a = new Date(d), b = new Date();
    return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();
  },

  isThisWeek(d) {
    if (!d) return false;
    const a = new Date(d), now = new Date();
    const diff = (now - a) / (1000 * 60 * 60 * 24);
    return diff >= 0 && diff < 7;
  },

  isThisYear(d) {
    if (!d) return false;
    const a = new Date(d), b = new Date();
    return a.getFullYear() === b.getFullYear();
  },

  validatePhone(phone) {
    return /^[6-9]\d{9}$/.test((phone || '').trim());
  },

  escapeHtml(str) {
    if (str === null || str === undefined) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  },

  debounce(fn, wait) {
    let t;
    return (...args) => {
      clearTimeout(t);
      t = setTimeout(() => fn(...args), wait);
    };
  },

  // ---------------- Toast Notifications ----------------
  toast(message, type = 'info') {
    const container = document.getElementById('toastContainer');
    if (!container) return;
    const el = document.createElement('div');
    el.className = `toast toast-${type}`;
    const icons = { success: '✅', error: '❌', info: 'ℹ️', warning: '⚠️' };
    el.innerHTML = `<span class="toast-icon">${icons[type] || icons.info}</span><span class="toast-msg">${this.escapeHtml(message)}</span>`;
    container.appendChild(el);
    requestAnimationFrame(() => el.classList.add('show'));
    setTimeout(() => {
      el.classList.remove('show');
      setTimeout(() => el.remove(), 300);
    }, 3200);
  },

  // ---------------- Confirm Modal ----------------
  confirm(message, title = 'Please Confirm') {
    return new Promise(resolve => {
      const overlay = document.getElementById('confirmModal');
      const titleEl = document.getElementById('confirmTitle');
      const msgEl = document.getElementById('confirmMsg');
      const yesBtn = document.getElementById('confirmYes');
      const noBtn = document.getElementById('confirmNo');
      titleEl.textContent = title;
      msgEl.textContent = message;
      overlay.classList.add('open');
      const cleanup = (result) => {
        overlay.classList.remove('open');
        yesBtn.removeEventListener('click', onYes);
        noBtn.removeEventListener('click', onNo);
        resolve(result);
      };
      const onYes = () => cleanup(true);
      const onNo = () => cleanup(false);
      yesBtn.addEventListener('click', onYes);
      noBtn.addEventListener('click', onNo);
    });
  },

  openModal(id) {
    const el = document.getElementById(id);
    if (el) el.classList.add('open');
  },
  closeModal(id) {
    const el = document.getElementById(id);
    if (el) el.classList.remove('open');
  },

  numToWords(num) {
    // Simple Indian-style number to words (English fallback, used sparingly)
    num = Math.round(Number(num) || 0);
    if (num === 0) return 'Zero';
    const a = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten',
      'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
    const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
    function two(n) { if (n < 20) return a[n]; return b[Math.floor(n / 10)] + (n % 10 ? ' ' + a[n % 10] : ''); }
    function three(n) { return (n >= 100 ? a[Math.floor(n / 100)] + ' Hundred ' : '') + two(n % 100); }
    let str = '';
    const crore = Math.floor(num / 10000000); num %= 10000000;
    const lakh = Math.floor(num / 100000); num %= 100000;
    const thousand = Math.floor(num / 1000); num %= 1000;
    if (crore) str += three(crore) + ' Crore ';
    if (lakh) str += three(lakh) + ' Lakh ';
    if (thousand) str += three(thousand) + ' Thousand ';
    if (num) str += three(num);
    return str.trim() + ' Rupees Only';
  }
};

window.Utils = Utils;
