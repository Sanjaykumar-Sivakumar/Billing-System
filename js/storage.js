/* ============================================================
   storage.js — LocalStorage Data Layer (Siva's Billing App)
   All persistence goes through this module. No UI logic here.
   ============================================================ */

const DB_KEYS = {
  CUSTOMERS: 'ssb_customers',
  VEHICLES: 'ssb_vehicles',
  INVOICES: 'ssb_invoices',
  STOCK: 'ssb_stock',
  OILS: 'ssb_oils',
  LABOUR: 'ssb_labour',
  CHARGES: 'ssb_charges',
  SETTINGS: 'ssb_settings',
  SESSION: 'ssb_session',
  INVOICE_SEQ: 'ssb_invoice_seq',
  THEME: 'ssb_theme'
};

const Storage = {
  _read(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      if (raw === null || raw === undefined) return fallback;
      return JSON.parse(raw);
    } catch (e) {
      console.error('Storage read error', key, e);
      return fallback;
    }
  },
  _write(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (e) {
      console.error('Storage write error', key, e);
      return false;
    }
  },

  // Generic collection helpers
  getAll(key) { return this._read(key, []); },
  saveAll(key, arr) { return this._write(key, arr); },

  getById(key, id) {
    return this.getAll(key).find(x => x.id === id) || null;
  },
  upsert(key, item) {
    const all = this.getAll(key);
    const idx = all.findIndex(x => x.id === item.id);
    if (idx >= 0) all[idx] = item; else all.push(item);
    this.saveAll(key, all);
    return item;
  },
  remove(key, id) {
    const all = this.getAll(key).filter(x => x.id !== id);
    this.saveAll(key, all);
  },

  // Settings (single object)
  getSettings() {
    return this._read(DB_KEYS.SETTINGS, {
      appName: "Siva's Billing App",
      workshopName: 'Siva Sakthi',
      ownerName: 'Sivakumar S',
      address: '',
      phone: '',
      logo: '',
      invoicePrefix: 'SS',
      thankYouMsg: 'Thank you! Visit again.',
      username: 'admin',
      password: '1234'
    });
  },
  saveSettings(s) { return this._write(DB_KEYS.SETTINGS, s); },

  // Session
  getSession() { return this._read(DB_KEYS.SESSION, null); },
  setSession(s) { return this._write(DB_KEYS.SESSION, s); },
  clearSession() { localStorage.removeItem(DB_KEYS.SESSION); },

  // Theme
  getTheme() { return this._read(DB_KEYS.THEME, 'light'); },
  setTheme(t) { return this._write(DB_KEYS.THEME, t); },

  // Invoice numbering
  nextInvoiceNumber() {
    let seq = this._read(DB_KEYS.INVOICE_SEQ, 0);
    seq += 1;
    this._write(DB_KEYS.INVOICE_SEQ, seq);
    const settings = this.getSettings();
    const year = new Date().getFullYear();
    return `${settings.invoicePrefix || 'SS'}-${year}-${String(seq).padStart(4, '0')}`;
  },

  // Backup / Restore
  exportAll() {
    const dump = {};
    Object.values(DB_KEYS).forEach(k => {
      dump[k] = this._read(k, null);
    });
    dump._exportedAt = new Date().toISOString();
    dump._app = "Siva's Billing App";
    return dump;
  },
  importAll(dump) {
    Object.values(DB_KEYS).forEach(k => {
      if (dump[k] !== undefined && dump[k] !== null) {
        this._write(k, dump[k]);
      }
    });
    return true;
  },
  resetAll() {
    Object.values(DB_KEYS).forEach(k => localStorage.removeItem(k));
  },

  // Seed default reference data (labour, charges) on first run
  seedIfEmpty() {
    if (this.getAll(DB_KEYS.LABOUR).length === 0) {
      this.saveAll(DB_KEYS.LABOUR, [
        { id: Utils.uid(), name: 'ஜெனரல் சர்வீஸ்', price: 250 },
        { id: Utils.uid(), name: 'இன்ஜின் வேலை', price: 800 },
        { id: Utils.uid(), name: 'எலெக்ட்ரிக்கல் வேலை', price: 300 },
        { id: Utils.uid(), name: 'பிரேக் வேலை', price: 150 },
        { id: Utils.uid(), name: 'செயின் வேலை', price: 200 },
        { id: Utils.uid(), name: 'கிளட்ச் வேலை', price: 350 }
      ]);
    }
    if (this.getAll(DB_KEYS.STOCK).length === 0) {
      this.saveAll(DB_KEYS.STOCK, [
        { id: Utils.uid(), name: 'பிரேக் ஷூ' },
        { id: Utils.uid(), name: 'கிளட்ச் கேபிள்' },
        { id: Utils.uid(), name: 'ஸ்பார்க் பிளக்' },
        { id: Utils.uid(), name: 'செயின் ஸ்பிராக்கெட்' },
        { id: Utils.uid(), name: 'ஏர் பில்டர்' },
        { id: Utils.uid(), name: 'ஆயில் பில்டர்' },
        { id: Utils.uid(), name: 'டிஸ்க் பேட்' },
        { id: Utils.uid(), name: 'ட்யூப்' },
        { id: Utils.uid(), name: 'டயர்' },
        { id: Utils.uid(), name: 'பேட்டரி' }
      ]);
    }
    if (this.getAll(DB_KEYS.OILS).length === 0) {
      this.saveAll(DB_KEYS.OILS, [
        { id: Utils.uid(), brand: 'Castrol' },
        { id: Utils.uid(), brand: 'Motul' },
        { id: Utils.uid(), brand: 'Shell' },
        { id: Utils.uid(), brand: 'Servo' },
        { id: Utils.uid(), brand: 'Yamalube' }
      ]);
    }
    if (this.getAll(DB_KEYS.CHARGES).length === 0) {
      this.saveAll(DB_KEYS.CHARGES, [
        { id: Utils.uid(), name: 'பிக்அப்', price: 100 },
        { id: Utils.uid(), name: 'டெலிவரி', price: 100 },
        { id: Utils.uid(), name: 'பார்க்கிங்', price: 20 }
      ]);
    }
  }
};

window.DB_KEYS = DB_KEYS;
window.Storage = Storage;
