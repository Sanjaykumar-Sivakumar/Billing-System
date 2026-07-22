/* ============================================================
   settings.js — Workshop Settings, Backup/Restore, Reset
   ============================================================ */

const Settings = {
  render() {
    const main = document.getElementById('mainContent');
    const s = Storage.getSettings();
    main.innerHTML = `
      <div class="page-header">
        <div><h1>Settings</h1><p class="page-sub">Workshop details and preferences</p></div>
      </div>

      <div class="dash-grid">
        <div class="card glass">
          <h3>🏪 Workshop Details</h3>
          <form id="settingsForm">
            <div class="form-group"><label>Workshop Name</label><input class="input" name="workshopName" value="${Utils.escapeHtml(s.workshopName)}"></div>
            <div class="form-group"><label>Owner Name</label><input class="input" name="ownerName" value="${Utils.escapeHtml(s.ownerName)}"></div>
            <div class="form-group"><label>Address</label><input class="input" name="address" value="${Utils.escapeHtml(s.address)}"></div>
            <div class="form-group"><label>Phone Number</label><input class="input" name="phone" value="${Utils.escapeHtml(s.phone)}"></div>
            <div class="form-group"><label>Invoice Number Prefix</label><input class="input" name="invoicePrefix" value="${Utils.escapeHtml(s.invoicePrefix)}"></div>
            <div class="form-group"><label>Thank You Message</label><input class="input" name="thankYouMsg" value="${Utils.escapeHtml(s.thankYouMsg)}"></div>
            <div class="form-group">
              <label>Logo</label>
              <input type="file" accept="image/*" class="input" id="logoInput">
              ${s.logo ? `<img src="${s.logo}" class="logo-preview" id="logoPreview">` : '<img class="logo-preview" id="logoPreview" style="display:none">'}
            </div>
            <button type="submit" class="btn btn-primary ripple">💾 Save</button>
          </form>
        </div>

        <div class="card glass">
          <h3>🔐 Login Details</h3>
          <form id="loginSettingsForm">
            <div class="form-group"><label>Username</label><input class="input" name="username" value="${Utils.escapeHtml(s.username)}"></div>
            <div class="form-group"><label>New Password (only if changing)</label><input type="password" class="input" name="password" placeholder="●●●●●●●●"></div>
            <button type="submit" class="btn btn-primary ripple">🔑 Update</button>
          </form>

          <h3 style="margin-top:24px">🎨 Theme</h3>
          <div class="theme-switch-row">
            <button class="btn btn-secondary ripple" id="setLightTheme">☀️ Light Mode</button>
            <button class="btn btn-secondary ripple" id="setDarkTheme">🌙 Dark Mode</button>
          </div>
        </div>
      </div>

      <div class="card glass">
        <h3>💾 Backup &amp; Restore</h3>
        <p class="page-sub">Keep your data safe.</p>
        <div class="settings-actions">
          <button class="btn btn-secondary ripple" id="exportBtn">⬇️ Download Backup (JSON)</button>
          <label class="btn btn-secondary ripple" for="importFile">⬆️ Restore Backup</label>
          <input type="file" id="importFile" accept="application/json" style="display:none">
          <button class="btn btn-danger ripple" id="resetBtn">🗑️ Erase All Data</button>
        </div>
      </div>
    `;

    document.getElementById('settingsForm').addEventListener('submit', (e) => this.saveWorkshopSettings(e));
    document.getElementById('loginSettingsForm').addEventListener('submit', (e) => this.saveLoginSettings(e));
    document.getElementById('logoInput').addEventListener('change', (e) => this.handleLogo(e));
    document.getElementById('setLightTheme').addEventListener('click', () => { Storage.setTheme('light'); App.applyTheme('light'); });
    document.getElementById('setDarkTheme').addEventListener('click', () => { Storage.setTheme('dark'); App.applyTheme('dark'); });
    document.getElementById('exportBtn').addEventListener('click', () => this.exportBackup());
    document.getElementById('importFile').addEventListener('change', (e) => this.importBackup(e));
    document.getElementById('resetBtn').addEventListener('click', () => this.resetData());
  },

  handleLogo(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const s = Storage.getSettings();
      s.logo = reader.result;
      Storage.saveSettings(s);
      const preview = document.getElementById('logoPreview');
      preview.src = reader.result;
      preview.style.display = 'block';
      App.renderTopbarInfo();
      Utils.toast('Logo updated', 'success');
    };
    reader.readAsDataURL(file);
  },

  saveWorkshopSettings(e) {
    e.preventDefault();
    const fd = new FormData(e.target);
    const s = Storage.getSettings();
    s.workshopName = fd.get('workshopName').trim();
    s.ownerName = fd.get('ownerName').trim();
    s.address = fd.get('address').trim();
    s.phone = fd.get('phone').trim();
    s.invoicePrefix = fd.get('invoicePrefix').trim() || 'SS';
    s.thankYouMsg = fd.get('thankYouMsg').trim();
    Storage.saveSettings(s);
    App.renderTopbarInfo();
    Utils.toast('Settings saved', 'success');
  },

  saveLoginSettings(e) {
    e.preventDefault();
    const fd = new FormData(e.target);
    const s = Storage.getSettings();
    s.username = fd.get('username').trim() || s.username;
    const newPass = fd.get('password').trim();
    if (newPass) s.password = newPass;
    Storage.saveSettings(s);
    Utils.toast('Login details updated', 'success');
  },

  exportBackup() {
    const data = Storage.exportAll();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `siva-billing-backup-${Utils.todayISO()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    Utils.toast('Backup downloaded', 'success');
  },

  importBackup(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const data = JSON.parse(reader.result);
        const ok = await Utils.confirm('Current data will be overwritten. Continue?', 'Restore Backup');
        if (!ok) return;
        Storage.importAll(data);
        Utils.toast('Data restored! Reloading...', 'success');
        setTimeout(() => window.location.reload(), 1200);
      } catch (err) {
        Utils.toast('Invalid backup file', 'error');
      }
    };
    reader.readAsText(file);
  },

  async resetData() {
    const ok = await Utils.confirm('All data will be permanently erased. Continue?', 'Warning!');
    if (!ok) return;
    const ok2 = await Utils.confirm('This cannot be undone. Are you sure?', 'Final Confirmation');
    if (!ok2) return;
    Storage.resetAll();
    Utils.toast('All data erased', 'info');
    setTimeout(() => window.location.reload(), 1000);
  }
};

window.Settings = Settings;
