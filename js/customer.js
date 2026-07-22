/* ============================================================
   customer.js — Customer & Vehicle CRUD + Service History
   Mandatory: Name, Bike Number. Everything else optional.
   ============================================================ */

const Customer = {
  searchTerm: '',

  renderList() {
    const main = document.getElementById('mainContent');
    main.innerHTML = `
      <div class="page-header">
        <div><h1>Customers</h1><p class="page-sub">Customer and vehicle details</p></div>
        <button class="btn btn-primary btn-lg ripple" id="addCustomerBtn">➕ New Customer</button>
      </div>
      <div class="card glass">
        <div class="search-row">
          <input type="text" id="custSearch" class="input" placeholder="🔍 Search by name / phone / bike number...">
        </div>
        <div id="custListWrap"></div>
      </div>
    `;
    document.getElementById('addCustomerBtn').addEventListener('click', () => this.openForm());
    const searchInput = document.getElementById('custSearch');
    searchInput.addEventListener('input', Utils.debounce(() => {
      this.searchTerm = searchInput.value.trim();
      this.renderTable();
    }, 200));
    this.renderTable();
  },

  getFiltered() {
    const customers = Storage.getAll(DB_KEYS.CUSTOMERS);
    const vehicles = Storage.getAll(DB_KEYS.VEHICLES);
    const term = this.searchTerm.toLowerCase();
    return customers
      .map(c => ({ ...c, vehicles: vehicles.filter(v => v.customerId === c.id) }))
      .filter(c => {
        if (!term) return true;
        const bikeMatch = c.vehicles.some(v => (v.bikeNumber || '').toLowerCase().includes(term));
        return c.name.toLowerCase().includes(term) || (c.phone || '').includes(term) || bikeMatch;
      })
      .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  },

  renderTable() {
    const wrap = document.getElementById('custListWrap');
    if (!wrap) return;
    const list = this.getFiltered();
    if (list.length === 0) {
      wrap.innerHTML = '<p class="empty-msg">No customers yet.</p>';
      return;
    }
    wrap.innerHTML = `
      <div class="table-wrap">
      <table class="data-table">
        <thead><tr><th>Name</th><th>Phone</th><th>Vehicles</th><th>Total Visits</th><th></th></tr></thead>
        <tbody>
          ${list.map(c => `
            <tr>
              <td>${Utils.escapeHtml(c.name)}</td>
              <td>${Utils.escapeHtml(c.phone || '-')}</td>
              <td>${c.vehicles.map(v => `<span class="chip">${Utils.escapeHtml(v.bikeNumber)}</span>`).join(' ') || '-'}</td>
              <td>${this.visitCount(c.id)}</td>
              <td class="row-actions">
                <button class="btn btn-sm btn-ghost" data-act="history" data-id="${c.id}">History</button>
                <button class="btn btn-sm btn-ghost" data-act="edit" data-id="${c.id}">✏️</button>
                <button class="btn btn-sm btn-ghost danger" data-act="del" data-id="${c.id}">🗑️</button>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
      </div>
    `;
    wrap.querySelectorAll('[data-act="edit"]').forEach(b => b.addEventListener('click', () => this.openForm(b.dataset.id)));
    wrap.querySelectorAll('[data-act="history"]').forEach(b => b.addEventListener('click', () => this.openHistory(b.dataset.id)));
    wrap.querySelectorAll('[data-act="del"]').forEach(b => b.addEventListener('click', () => this.deleteCustomer(b.dataset.id)));
  },

  visitCount(customerId) {
    const vehicles = Storage.getAll(DB_KEYS.VEHICLES).filter(v => v.customerId === customerId).map(v => v.id);
    return Storage.getAll(DB_KEYS.INVOICES).filter(i => vehicles.includes(i.vehicleId)).length;
  },

  openForm(id) {
    const customer = id ? Storage.getById(DB_KEYS.CUSTOMERS, id) : null;
    const vehicles = id ? Storage.getAll(DB_KEYS.VEHICLES).filter(v => v.customerId === id) : [];
    const body = `
      <form id="custForm">
        <div class="form-row">
          <div class="form-group"><label>Customer Name *</label><input required class="input" name="name" value="${Utils.escapeHtml(customer?.name || '')}" placeholder="Enter name"></div>
          <div class="form-group"><label>Phone Number <em>(optional)</em></label><input class="input" name="phone" value="${Utils.escapeHtml(customer?.phone || '')}" placeholder="10-digit number" maxlength="10"></div>
        </div>
        <div class="form-group"><label>Address <em>(optional)</em></label><input class="input" name="address" value="${Utils.escapeHtml(customer?.address || '')}" placeholder="Address"></div>

        <h4 class="section-title">🏍️ Vehicles</h4>
        <div id="vehicleRows">
          ${vehicles.length ? vehicles.map(v => this.vehicleRowHtml(v)).join('') : this.vehicleRowHtml()}
        </div>
        <button type="button" class="btn btn-ghost btn-sm ripple" id="addVehicleRow">➕ Add another vehicle</button>

        <div class="modal-actions">
          <button type="button" class="btn btn-secondary" id="custCancelBtn">Cancel</button>
          <button type="submit" class="btn btn-primary">Save</button>
        </div>
      </form>
    `;
    this.showFormModal(customer ? 'Edit Customer' : 'New Customer', body);

    document.getElementById('addVehicleRow').addEventListener('click', () => {
      document.getElementById('vehicleRows').insertAdjacentHTML('beforeend', this.vehicleRowHtml());
      this.bindVehicleRowRemovers();
    });
    this.bindVehicleRowRemovers();

    document.getElementById('custCancelBtn').addEventListener('click', () => Utils.closeModal('formModal'));
    document.getElementById('custForm').addEventListener('submit', (e) => {
      e.preventDefault();
      this.saveCustomer(e.target, customer, vehicles);
    });
  },

  bindVehicleRowRemovers() {
    document.querySelectorAll('.remove-vehicle-row').forEach(btn => {
      btn.onclick = () => {
        if (document.querySelectorAll('.vehicle-row').length > 1) btn.closest('.vehicle-row').remove();
        else Utils.toast('At least one vehicle is required', 'warning');
      };
    });
  },

  vehicleRowHtml(v) {
    return `
      <div class="vehicle-row" data-id="${v?.id || ''}">
        <div class="form-row">
          <div class="form-group"><label>Bike Number *</label><input required class="input" name="bikeNumber" value="${Utils.escapeHtml(v?.bikeNumber || '')}" placeholder="TN-XX-XX-XXXX"></div>
          <div class="form-group"><label>Bike Model <em>(optional)</em></label><input class="input" name="bikeModel" value="${Utils.escapeHtml(v?.bikeModel || '')}" placeholder="Model name"></div>
        </div>
        <button type="button" class="btn btn-ghost btn-xs remove-vehicle-row">✖ Remove this vehicle</button>
      </div>
    `;
  },

  saveCustomer(form, existing, existingVehicles) {
    const fd = new FormData(form);
    const name = fd.get('name').trim();
    const phone = fd.get('phone').trim();
    if (!name) return Utils.toast('Customer name is required', 'error');
    if (phone && !/^\d{10}$/.test(phone)) return Utils.toast('Enter a valid 10-digit phone number', 'error');

    const customer = existing || { id: Utils.uid(), createdAt: Date.now() };
    customer.name = name;
    customer.phone = phone;
    customer.address = fd.get('address').trim();
    Storage.upsert(DB_KEYS.CUSTOMERS, customer);

    const bikeNumbers = fd.getAll('bikeNumber');
    const bikeModels = fd.getAll('bikeModel');
    const rows = document.querySelectorAll('.vehicle-row');
    const keptIds = [];
    rows.forEach((row, idx) => {
      const bikeNumber = (bikeNumbers[idx] || '').trim();
      if (!bikeNumber) return;
      const existingId = row.dataset.id;
      const vehicle = existingId ? Storage.getById(DB_KEYS.VEHICLES, existingId) : { id: Utils.uid(), createdAt: Date.now() };
      vehicle.customerId = customer.id;
      vehicle.bikeNumber = bikeNumber.toUpperCase();
      vehicle.bikeModel = (bikeModels[idx] || '').trim();
      Storage.upsert(DB_KEYS.VEHICLES, vehicle);
      keptIds.push(vehicle.id);
    });
    // Remove vehicles that were deleted from the form
    (existingVehicles || []).forEach(v => {
      if (!keptIds.includes(v.id)) Storage.remove(DB_KEYS.VEHICLES, v.id);
    });

    Utils.toast('Customer saved', 'success');
    Utils.closeModal('formModal');
    this.renderTable();
  },

  async deleteCustomer(id) {
    const ok = await Utils.confirm('Delete this customer and all their vehicles?', 'Delete');
    if (!ok) return;
    Storage.getAll(DB_KEYS.VEHICLES).filter(v => v.customerId === id).forEach(v => Storage.remove(DB_KEYS.VEHICLES, v.id));
    Storage.remove(DB_KEYS.CUSTOMERS, id);
    Utils.toast('Deleted', 'success');
    this.renderTable();
  },

  openHistory(customerId) {
    const customer = Storage.getById(DB_KEYS.CUSTOMERS, customerId);
    const vehicles = Storage.getAll(DB_KEYS.VEHICLES).filter(v => v.customerId === customerId);
    const vehicleIds = vehicles.map(v => v.id);
    const invoices = Storage.getAll(DB_KEYS.INVOICES)
      .filter(i => vehicleIds.includes(i.vehicleId))
      .sort((a, b) => new Date(b.date) - new Date(a.date));
    const totalSpent = invoices.reduce((s, i) => s + (i.grandTotal || 0), 0);

    const body = `
      <div class="history-summary">
        <div><span class="stat-label">Total Visits</span><span class="stat-value">${invoices.length}</span></div>
        <div><span class="stat-label">Total Spent</span><span class="stat-value">${Utils.formatCurrency(totalSpent)}</span></div>
        <div><span class="stat-label">Vehicles</span><span class="stat-value">${vehicles.length}</span></div>
      </div>
      ${invoices.length === 0 ? '<p class="empty-msg">No service history yet</p>' : `
      <div class="table-wrap">
      <table class="data-table">
        <thead><tr><th>Date</th><th>Bike No</th><th>Problem</th><th>KM</th><th>Amount</th><th></th></tr></thead>
        <tbody>
          ${invoices.map(i => `
            <tr>
              <td>${Utils.formatDate(i.date)}</td>
              <td>${Utils.escapeHtml(i.bikeNumber)}</td>
              <td>${Utils.escapeHtml(i.problem || '-')}</td>
              <td>${Utils.escapeHtml(i.km || '-')}</td>
              <td>${Utils.formatCurrency(i.grandTotal)}</td>
              <td><button class="btn btn-sm btn-ghost hist-view" data-id="${i.id}">View</button></td>
            </tr>
          `).join('')}
        </tbody>
      </table>
      </div>
      `}
    `;
    this.showFormModal(`📋 ${customer.name} - Service History`, body);
    document.querySelectorAll('.hist-view').forEach(b => b.addEventListener('click', () => {
      Utils.closeModal('formModal');
      Billing.viewInvoice(b.dataset.id);
    }));
  },

  // Lookup used by Billing module for auto-history on bike/phone entry
  findByBikeOrPhone(term) {
    term = (term || '').trim().toLowerCase();
    if (!term) return null;
    const vehicles = Storage.getAll(DB_KEYS.VEHICLES);
    const customers = Storage.getAll(DB_KEYS.CUSTOMERS);
    let vehicle = vehicles.find(v => v.bikeNumber.toLowerCase() === term);
    let customer;
    if (vehicle) {
      customer = customers.find(c => c.id === vehicle.customerId);
    } else {
      customer = customers.find(c => c.phone && c.phone === term);
      if (customer) vehicle = vehicles.find(v => v.customerId === customer.id);
    }
    if (!customer) return null;
    const invoices = Storage.getAll(DB_KEYS.INVOICES)
      .filter(i => i.vehicleId === vehicle?.id)
      .sort((a, b) => new Date(b.date) - new Date(a.date));
    return { customer, vehicle, invoices, totalSpent: invoices.reduce((s, i) => s + (i.grandTotal || 0), 0) };
  },

  showFormModal(title, bodyHtml) {
    document.getElementById('formModalTitle').textContent = title;
    document.getElementById('formModalBody').innerHTML = bodyHtml;
    Utils.openModal('formModal');
  }
};

window.Customer = Customer;
