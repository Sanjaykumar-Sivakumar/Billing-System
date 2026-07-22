/* ============================================================
   billing.js — New Bill, Live Calculation, Bill History
   No GST anywhere. Prices are entered fresh on every bill —
   only spare part names and oil brand names are stored
   permanently (in Stock master lists).
   Mandatory: Customer Name, Bike Number, Kilometers.
   Everything else is optional.
   ============================================================ */

const Billing = {
  draft: null,

  blankDraft() {
    return {
      id: null,
      invoiceNo: null,
      date: Utils.todayISO(),
      customerId: null,
      customerName: '',
      phone: '',
      vehicleId: null,
      bikeNumber: '',
      bikeModel: '',
      km: '',
      mechanicName: '',
      problem: '',
      deliveryDate: '',
      status: 'paid',
      parts: [],       // { itemId, name, price, qty }
      oils: [],         // { itemId, brand, price, qty }
      labour: [],       // { name, price }
      waterWash: 0,
      charges: [],       // { name, price } — other charges (pickup, delivery, parking, misc)
      discount: 0
    };
  },

  renderNew(existing) {
    this.draft = existing ? JSON.parse(JSON.stringify(existing)) : this.blankDraft();
    const main = document.getElementById('mainContent');

    main.innerHTML = `
      <div class="page-header">
        <div><h1>${existing ? 'Edit Bill' : 'New Bill'}</h1><p class="page-sub">Create a bill in under 30 seconds!</p></div>
      </div>

      <div class="bill-layout">
        <div class="bill-form">

          <div class="card glass">
            <h3>👤 Customer &amp; Vehicle</h3>
            <div class="form-row">
              <div class="form-group">
                <label>Bike Number / Phone Number</label>
                <input class="input" id="fBikeLookup" placeholder="Enter bike number or phone to look up history" autocomplete="off">
                <div id="historyHint"></div>
              </div>
            </div>
            <div class="form-row">
              <div class="form-group"><label>Customer Name *</label><input required class="input" id="fCustomerName" value="${Utils.escapeHtml(this.draft.customerName)}"></div>
              <div class="form-group"><label>Phone Number <em>(optional)</em></label><input class="input" id="fPhone" maxlength="10" value="${Utils.escapeHtml(this.draft.phone)}"></div>
            </div>
            <div class="form-row">
              <div class="form-group"><label>Bike Number *</label><input required class="input" id="fBikeNumber" value="${Utils.escapeHtml(this.draft.bikeNumber)}"></div>
              <div class="form-group"><label>Bike Model <em>(optional)</em></label><input class="input" id="fBikeModel" value="${Utils.escapeHtml(this.draft.bikeModel)}"></div>
            </div>
            <div class="form-row">
              <div class="form-group"><label>Kilometers *</label><input required class="input" id="fKm" value="${Utils.escapeHtml(this.draft.km)}" placeholder="e.g. 12500"></div>
              <div class="form-group"><label>Mechanic Name <em>(optional)</em></label><input class="input" id="fMechanic" value="${Utils.escapeHtml(this.draft.mechanicName)}"></div>
            </div>
            <div class="form-group">
              <label>Problem Description <em>(optional)</em></label>
              <textarea class="input" id="fProblem" rows="2" placeholder="e.g. வண்டி ஸ்டார்ட் ஆகவில்லை">${Utils.escapeHtml(this.draft.problem)}</textarea>
            </div>
            <div class="form-row">
              <div class="form-group"><label>Delivery Date <em>(optional)</em></label><input type="date" class="input" id="fDeliveryDate" value="${this.draft.deliveryDate || ''}"></div>
              <div class="form-group"><label>Status</label>
                <select class="input select" id="fStatus">
                  <option value="paid" ${this.draft.status === 'paid' ? 'selected' : ''}>Paid</option>
                  <option value="pending" ${this.draft.status === 'pending' ? 'selected' : ''}>Pending</option>
                </select>
              </div>
            </div>
          </div>

          <div class="card glass">
            <h3>🔧 Spare Parts</h3>
            <div class="add-row">
              <select class="input select" id="partSelect">
                <option value="">-- Select part name --</option>
                ${Storage.getAll(DB_KEYS.STOCK).map(s => `<option value="${s.id}">${Utils.escapeHtml(s.name)}</option>`).join('')}
                <option value="__custom__">✏️ Add new part name...</option>
              </select>
              <button type="button" class="btn btn-secondary ripple" id="addPartBtn">➕ Add</button>
            </div>
            <p class="hint-line">Select a part, then enter its price and quantity below. Don't see the part? Choose "Add new part name".</p>
            <div id="partsRows"></div>
          </div>

          <div class="card glass">
            <h3>🛢️ Engine Oil</h3>
            <div class="add-row">
              <select class="input select" id="oilSelect">
                <option value="">-- Select oil brand --</option>
                ${Storage.getAll(DB_KEYS.OILS).map(o => `<option value="${o.id}">${Utils.escapeHtml(o.brand)}</option>`).join('')}
                <option value="__custom__">✏️ Add new oil brand...</option>
              </select>
              <button type="button" class="btn btn-secondary ripple" id="addOilBtnBill">➕ Add</button>
            </div>
            <p class="hint-line">Select a brand, then enter its price and quantity (litres) below.</p>
            <div id="oilsRows"></div>
          </div>

          <div class="card glass">
            <h3>🛠️ Labour Charges</h3>
            <div class="add-row">
              <select class="input select" id="labourSelect"><option value="">-- Select labour type --</option>
                ${Storage.getAll(DB_KEYS.LABOUR).map(l => `<option value="${l.id}">${Utils.escapeHtml(l.name)}</option>`).join('')}
                <option value="custom">✏️ Other (custom)</option>
              </select>
              <button type="button" class="btn btn-secondary ripple" id="addLabourBtn">➕ Add</button>
            </div>
            <div id="labourRows"></div>
          </div>

          <div class="card glass">
            <h3>💧 Water Wash Charge</h3>
            <div class="form-group" style="max-width:220px">
              <label>Water Wash Amount (₹)</label>
              <input type="number" min="0" step="0.01" class="input" id="fWaterWash" value="${this.draft.waterWash || 0}">
            </div>
          </div>

          <div class="card glass">
            <h3>➕ Other Charges</h3>
            <div class="add-row">
              <select class="input select" id="chargeSelect"><option value="">-- Select charge type --</option>
                ${Storage.getAll(DB_KEYS.CHARGES).map(c => `<option value="${c.id}">${Utils.escapeHtml(c.name)} (${Utils.formatCurrency(c.price)})</option>`).join('')}
                <option value="custom">✏️ Other (custom)</option>
              </select>
              <button type="button" class="btn btn-secondary ripple" id="addChargeBtn">➕ Add</button>
            </div>
            <div id="chargesRows"></div>
          </div>

        </div>

        <div class="bill-summary">
          <div class="card glass summary-card">
            <h3>🧾 Bill Summary</h3>
            <div class="summary-line"><span>Spare Parts Total</span><span id="sumParts">₹0.00</span></div>
            <div class="summary-line"><span>Engine Oil Total</span><span id="sumOils">₹0.00</span></div>
            <div class="summary-line"><span>Labour Charges</span><span id="sumLabour">₹0.00</span></div>
            <div class="summary-line"><span>Water Wash Charge</span><span id="sumWaterWash">₹0.00</span></div>
            <div class="summary-line"><span>Other Charges</span><span id="sumCharges">₹0.00</span></div>
            <div class="summary-line"><span>Subtotal</span><span id="sumSub">₹0.00</span></div>
            <div class="summary-line">
              <span>Discount (₹) <em>(optional)</em></span>
              <input type="number" min="0" class="input input-sm" id="fDiscount" value="${this.draft.discount || 0}" style="width:110px">
            </div>
            <div class="summary-line summary-total"><span>Grand Total</span><span id="sumGrand">₹0.00</span></div>
            <button class="btn btn-primary btn-lg btn-block ripple" id="saveBillBtn">💾 Save &amp; Print Bill</button>
          </div>
        </div>
      </div>
    `;

    this.bindLookup();
    this.renderPartsRows();
    this.renderOilsRows();
    this.renderLabourRows();
    this.renderChargesRows();
    this.bindAdders();
    this.bindTopLevelInputs();
    this.recalc();

    document.getElementById('saveBillBtn').addEventListener('click', () => this.saveBill());
  },

  bindTopLevelInputs() {
    ['fCustomerName', 'fPhone', 'fBikeNumber', 'fBikeModel', 'fKm', 'fMechanic', 'fProblem', 'fDeliveryDate', 'fStatus', 'fDiscount', 'fWaterWash'].forEach(id => {
      const el = document.getElementById(id);
      const evt = (el.tagName === 'SELECT' || el.type === 'date') ? 'change' : 'input';
      el.addEventListener(evt, () => this.recalc());
    });
  },

  bindLookup() {
    const input = document.getElementById('fBikeLookup');
    input.addEventListener('input', Utils.debounce(() => this.lookupHistory(input.value), 250));
  },

  lookupHistory(term) {
    const hint = document.getElementById('historyHint');
    const result = Customer.findByBikeOrPhone(term);
    if (!result) { hint.innerHTML = ''; return; }
    const { customer, vehicle, invoices, totalSpent } = result;
    document.getElementById('fCustomerName').value = customer.name;
    document.getElementById('fPhone').value = customer.phone || '';
    this.draft.customerId = customer.id;
    if (vehicle) {
      document.getElementById('fBikeNumber').value = vehicle.bikeNumber;
      document.getElementById('fBikeModel').value = vehicle.bikeModel || '';
      this.draft.vehicleId = vehicle.id;
    }
    const last = invoices[0];
    hint.innerHTML = `
      <div class="history-hint glass">
        <strong>📋 Returning customer!</strong>
        Total visits: <b>${invoices.length}</b> · Total spent: <b>${Utils.formatCurrency(totalSpent)}</b>
        ${last ? `<br>Last service: ${Utils.formatDate(last.date)} — ${Utils.escapeHtml(last.problem || '-')} (KM: ${Utils.escapeHtml(last.km || '-')})` : ''}
      </div>
    `;
    Utils.toast('Customer history found', 'info');
  },

  bindAdders() {
    document.getElementById('addPartBtn').addEventListener('click', () => {
      const sel = document.getElementById('partSelect');
      if (!sel.value) { Utils.toast('Select a part name first (or choose "Add new part name")', 'warning'); return; }
      if (sel.value === '__custom__') {
        this.promptNewPart();
      } else {
        this.addPart(sel.value);
      }
      sel.value = '';
    });
    document.getElementById('addOilBtnBill').addEventListener('click', () => {
      const sel = document.getElementById('oilSelect');
      if (!sel.value) { Utils.toast('Select an oil brand first (or choose "Add new oil brand")', 'warning'); return; }
      if (sel.value === '__custom__') {
        this.promptNewOil();
      } else {
        this.addOil(sel.value);
      }
      sel.value = '';
    });
    document.getElementById('addLabourBtn').addEventListener('click', () => {
      const sel = document.getElementById('labourSelect');
      if (!sel.value) { Utils.toast('Select a labour type first', 'warning'); return; }
      if (sel.value === 'custom') {
        this.draft.labour.push({ name: '', price: 0, custom: true });
      } else {
        const l = Storage.getById(DB_KEYS.LABOUR, sel.value);
        this.draft.labour.push({ name: l.name, price: l.price });
      }
      sel.value = '';
      this.renderLabourRows(); this.recalc();
    });
    document.getElementById('addChargeBtn').addEventListener('click', () => {
      const sel = document.getElementById('chargeSelect');
      if (!sel.value) { Utils.toast('Select a charge type first', 'warning'); return; }
      if (sel.value === 'custom') {
        this.draft.charges.push({ name: '', price: 0, custom: true });
      } else {
        const c = Storage.getById(DB_KEYS.CHARGES, sel.value);
        this.draft.charges.push({ name: c.name, price: c.price });
      }
      sel.value = '';
      this.renderChargesRows(); this.recalc();
    });
  },

  promptNewPart() {
    const name = window.prompt('Enter the new spare part name:');
    if (!name || !name.trim()) return;
    const item = Stock.addNameIfMissing(name.trim());
    if (!item) return;
    // Refresh the dropdown so it's available next time too
    const sel = document.getElementById('partSelect');
    const opt = document.createElement('option');
    opt.value = item.id; opt.textContent = item.name;
    sel.insertBefore(opt, sel.lastElementChild);
    this.addPart(item.id);
    Utils.toast(`"${item.name}" added to the part list`, 'success');
  },

  promptNewOil() {
    const brand = window.prompt('Enter the new oil brand name:');
    if (!brand || !brand.trim()) return;
    const item = Stock.addOilBrandIfMissing(brand.trim());
    if (!item) return;
    const sel = document.getElementById('oilSelect');
    const opt = document.createElement('option');
    opt.value = item.id; opt.textContent = item.brand;
    sel.insertBefore(opt, sel.lastElementChild);
    this.addOil(item.id);
    Utils.toast(`"${item.brand}" added to the oil list`, 'success');
  },

  addPart(stockId) {
    const item = Storage.getById(DB_KEYS.STOCK, stockId);
    if (!item) return;
    this.draft.parts.push({ itemId: item.id, name: item.name, price: 0, qty: 1 });
    this.renderPartsRows(); this.recalc();
  },
  addOil(oilId) {
    const item = Storage.getById(DB_KEYS.OILS, oilId);
    if (!item) return;
    this.draft.oils.push({ itemId: item.id, brand: item.brand, price: 0, qty: 1 });
    this.renderOilsRows(); this.recalc();
  },

  renderPartsRows() {
    const wrap = document.getElementById('partsRows');
    if (this.draft.parts.length === 0) { wrap.innerHTML = '<p class="empty-msg">No spare parts added yet.</p>'; return; }
    wrap.innerHTML = `
      <div class="table-wrap"><table class="data-table compact">
        <thead><tr><th>Part</th><th>Price (₹)</th><th>Qty</th><th>Total</th><th></th></tr></thead>
        <tbody>
          ${this.draft.parts.map((p, idx) => `<tr>
            <td>${Utils.escapeHtml(p.name)}</td>
            <td><input type="number" min="0" step="0.01" class="input input-xs" data-idx="${idx}" data-field="price" value="${p.price || ''}" placeholder="Price"></td>
            <td><input type="number" min="1" class="input input-xs" data-idx="${idx}" data-field="qty" value="${p.qty}"></td>
            <td>${Utils.formatCurrency(p.qty * p.price)}</td>
            <td><button class="btn btn-sm btn-ghost danger" data-remove-part="${idx}">🗑️</button></td>
          </tr>`).join('')}
        </tbody>
      </table></div>
    `;
    wrap.querySelectorAll('input').forEach(inp => inp.addEventListener('input', (e) => {
      const idx = +e.target.dataset.idx, field = e.target.dataset.field;
      this.draft.parts[idx][field] = parseFloat(e.target.value) || 0;
      this.recalc(true);
    }));
    wrap.querySelectorAll('[data-remove-part]').forEach(b => b.addEventListener('click', () => {
      this.draft.parts.splice(+b.dataset.removePart, 1); this.renderPartsRows(); this.recalc();
    }));
  },

  renderOilsRows() {
    const wrap = document.getElementById('oilsRows');
    if (this.draft.oils.length === 0) { wrap.innerHTML = '<p class="empty-msg">No engine oil added yet.</p>'; return; }
    wrap.innerHTML = `
      <div class="table-wrap"><table class="data-table compact">
        <thead><tr><th>Brand</th><th>Price (₹/L)</th><th>Litres</th><th>Total</th><th></th></tr></thead>
        <tbody>
          ${this.draft.oils.map((o, idx) => `<tr>
            <td>${Utils.escapeHtml(o.brand)}</td>
            <td><input type="number" min="0" step="0.01" class="input input-xs" data-idx="${idx}" data-field="price" value="${o.price || ''}" placeholder="Price"></td>
            <td><input type="number" min="0.1" step="0.1" class="input input-xs" data-idx="${idx}" data-field="qty" value="${o.qty}"></td>
            <td>${Utils.formatCurrency(o.qty * o.price)}</td>
            <td><button class="btn btn-sm btn-ghost danger" data-remove-oil="${idx}">🗑️</button></td>
          </tr>`).join('')}
        </tbody>
      </table></div>
    `;
    wrap.querySelectorAll('input').forEach(inp => inp.addEventListener('input', (e) => {
      const idx = +e.target.dataset.idx, field = e.target.dataset.field;
      this.draft.oils[idx][field] = parseFloat(e.target.value) || 0;
      this.recalc(true);
    }));
    wrap.querySelectorAll('[data-remove-oil]').forEach(b => b.addEventListener('click', () => {
      this.draft.oils.splice(+b.dataset.removeOil, 1); this.renderOilsRows(); this.recalc();
    }));
  },

  renderLabourRows() {
    const wrap = document.getElementById('labourRows');
    if (this.draft.labour.length === 0) { wrap.innerHTML = '<p class="empty-msg">No labour charges added yet.</p>'; return; }
    wrap.innerHTML = `
      <div class="table-wrap"><table class="data-table compact">
        <thead><tr><th>Work</th><th>Price</th><th></th></tr></thead>
        <tbody>
          ${this.draft.labour.map((l, idx) => `<tr>
            <td><input class="input input-xs" data-idx="${idx}" data-field="name" value="${Utils.escapeHtml(l.name)}" placeholder="Work name"></td>
            <td><input type="number" min="0" step="0.01" class="input input-xs" data-idx="${idx}" data-field="price" value="${l.price}"></td>
            <td><button class="btn btn-sm btn-ghost danger" data-remove-labour="${idx}">🗑️</button></td>
          </tr>`).join('')}
        </tbody>
      </table></div>
    `;
    wrap.querySelectorAll('input').forEach(inp => inp.addEventListener('input', (e) => {
      const idx = +e.target.dataset.idx, field = e.target.dataset.field;
      this.draft.labour[idx][field] = field === 'price' ? (parseFloat(e.target.value) || 0) : e.target.value;
      this.recalc(true);
    }));
    wrap.querySelectorAll('[data-remove-labour]').forEach(b => b.addEventListener('click', () => {
      this.draft.labour.splice(+b.dataset.removeLabour, 1); this.renderLabourRows(); this.recalc();
    }));
  },

  renderChargesRows() {
    const wrap = document.getElementById('chargesRows');
    if (this.draft.charges.length === 0) { wrap.innerHTML = '<p class="empty-msg">No other charges added yet.</p>'; return; }
    wrap.innerHTML = `
      <div class="table-wrap"><table class="data-table compact">
        <thead><tr><th>Description</th><th>Price</th><th></th></tr></thead>
        <tbody>
          ${this.draft.charges.map((c, idx) => `<tr>
            <td><input class="input input-xs" data-idx="${idx}" data-field="name" value="${Utils.escapeHtml(c.name)}" placeholder="Description"></td>
            <td><input type="number" min="0" step="0.01" class="input input-xs" data-idx="${idx}" data-field="price" value="${c.price}"></td>
            <td><button class="btn btn-sm btn-ghost danger" data-remove-charge="${idx}">🗑️</button></td>
          </tr>`).join('')}
        </tbody>
      </table></div>
    `;
    wrap.querySelectorAll('input').forEach(inp => inp.addEventListener('input', (e) => {
      const idx = +e.target.dataset.idx, field = e.target.dataset.field;
      this.draft.charges[idx][field] = field === 'price' ? (parseFloat(e.target.value) || 0) : e.target.value;
      this.recalc(true);
    }));
    wrap.querySelectorAll('[data-remove-charge]').forEach(b => b.addEventListener('click', () => {
      this.draft.charges.splice(+b.dataset.removeCharge, 1); this.renderChargesRows(); this.recalc();
    }));
  },

  computeTotals() {
    const partsTotal = this.draft.parts.reduce((s, p) => s + p.qty * p.price, 0);
    const oilsTotal = this.draft.oils.reduce((s, o) => s + o.qty * o.price, 0);
    const labourTotal = this.draft.labour.reduce((s, l) => s + (l.price || 0), 0);
    const waterWash = parseFloat(document.getElementById('fWaterWash')?.value) || 0;
    const chargesTotal = this.draft.charges.reduce((s, c) => s + (c.price || 0), 0);
    const subTotal = partsTotal + oilsTotal + labourTotal + waterWash + chargesTotal;
    const discount = Math.min(parseFloat(document.getElementById('fDiscount')?.value) || 0, subTotal);
    const grandTotal = Math.max(0, subTotal - discount);
    return { partsTotal, oilsTotal, labourTotal, waterWash, chargesTotal, subTotal, discount, grandTotal };
  },

  recalc() {
    const t = this.computeTotals();
    document.getElementById('sumParts').textContent = Utils.formatCurrency(t.partsTotal);
    document.getElementById('sumOils').textContent = Utils.formatCurrency(t.oilsTotal);
    document.getElementById('sumLabour').textContent = Utils.formatCurrency(t.labourTotal);
    document.getElementById('sumWaterWash').textContent = Utils.formatCurrency(t.waterWash);
    document.getElementById('sumCharges').textContent = Utils.formatCurrency(t.chargesTotal);
    document.getElementById('sumSub').textContent = Utils.formatCurrency(t.subTotal);
    document.getElementById('sumGrand').textContent = Utils.formatCurrency(t.grandTotal);
  },

  validateDraft() {
    const name = document.getElementById('fCustomerName').value.trim();
    const bike = document.getElementById('fBikeNumber').value.trim();
    const km = document.getElementById('fKm').value.trim();
    const phone = document.getElementById('fPhone').value.trim();
    if (!name) { Utils.toast('Customer name is required', 'error'); return false; }
    if (!bike) { Utils.toast('Bike number is required', 'error'); return false; }
    if (!km) { Utils.toast('Kilometers is required', 'error'); return false; }
    if (phone && !/^\d{10}$/.test(phone)) { Utils.toast('Enter a valid 10-digit phone number, or leave it blank', 'error'); return false; }
    return true;
  },

  saveBill() {
    if (!this.validateDraft()) return;

    // Ensure customer & vehicle exist / are updated
    let customer = this.draft.customerId ? Storage.getById(DB_KEYS.CUSTOMERS, this.draft.customerId) : null;
    const name = document.getElementById('fCustomerName').value.trim();
    const phone = document.getElementById('fPhone').value.trim();
    if (!customer && phone) customer = Storage.getAll(DB_KEYS.CUSTOMERS).find(c => c.phone === phone);
    if (!customer) customer = { id: Utils.uid(), createdAt: Date.now() };
    customer.name = name; customer.phone = phone;
    Storage.upsert(DB_KEYS.CUSTOMERS, customer);

    const bikeNumber = document.getElementById('fBikeNumber').value.trim().toUpperCase();
    let vehicle = this.draft.vehicleId ? Storage.getById(DB_KEYS.VEHICLES, this.draft.vehicleId) : null;
    if (!vehicle) vehicle = Storage.getAll(DB_KEYS.VEHICLES).find(v => v.bikeNumber === bikeNumber && v.customerId === customer.id);
    if (!vehicle) vehicle = { id: Utils.uid(), customerId: customer.id, createdAt: Date.now() };
    vehicle.customerId = customer.id;
    vehicle.bikeNumber = bikeNumber;
    vehicle.bikeModel = document.getElementById('fBikeModel').value.trim();
    Storage.upsert(DB_KEYS.VEHICLES, vehicle);

    const t = this.computeTotals();
    const invoice = {
      id: this.draft.id || Utils.uid(),
      invoiceNo: this.draft.invoiceNo || Storage.nextInvoiceNumber(),
      date: this.draft.date || Utils.todayISO(),
      createdAt: this.draft.createdAt || Date.now(),
      customerId: customer.id,
      customerName: customer.name,
      phone: customer.phone,
      vehicleId: vehicle.id,
      bikeNumber: vehicle.bikeNumber,
      bikeModel: vehicle.bikeModel,
      km: document.getElementById('fKm').value.trim(),
      mechanicName: document.getElementById('fMechanic').value.trim(),
      problem: document.getElementById('fProblem').value.trim(),
      deliveryDate: document.getElementById('fDeliveryDate').value,
      status: document.getElementById('fStatus').value,
      parts: this.draft.parts,
      oils: this.draft.oils,
      labour: this.draft.labour,
      waterWash: t.waterWash,
      charges: this.draft.charges,
      discount: t.discount,
      subTotal: t.subTotal,
      grandTotal: t.grandTotal
    };
    Storage.upsert(DB_KEYS.INVOICES, invoice);

    Utils.toast(`Bill ${invoice.invoiceNo} saved!`, 'success');
    this.viewInvoice(invoice.id, true);
  },

  // ---------------- History ----------------
  searchTerm: '',
  renderHistory() {
    const main = document.getElementById('mainContent');
    main.innerHTML = `
      <div class="page-header">
        <div><h1>Bill History</h1><p class="page-sub">All bills in one place</p></div>
        <button class="btn btn-primary btn-lg ripple" id="newBillFromHistory">➕ New Bill</button>
      </div>
      <div class="card glass">
        <div class="search-row">
          <input type="text" id="billSearch" class="input" placeholder="🔍 Search by name / phone / bike / invoice no...">
          <input type="date" id="billDateFilter" class="input" style="max-width:180px">
        </div>
        <div id="billListWrap"></div>
      </div>
    `;
    document.getElementById('newBillFromHistory').addEventListener('click', () => Router.navigate('newbill'));
    document.getElementById('billSearch').addEventListener('input', Utils.debounce(e => { this.searchTerm = e.target.value; this.renderHistoryTable(); }, 200));
    document.getElementById('billDateFilter').addEventListener('change', () => this.renderHistoryTable());
    this.renderHistoryTable();
  },

  renderHistoryTable() {
    const wrap = document.getElementById('billListWrap');
    const term = this.searchTerm.toLowerCase();
    const dateFilter = document.getElementById('billDateFilter')?.value;
    let list = Storage.getAll(DB_KEYS.INVOICES).sort((a, b) => new Date(b.date) - new Date(a.date));
    if (term) list = list.filter(i => [i.customerName, i.phone, i.bikeNumber, i.invoiceNo].join(' ').toLowerCase().includes(term));
    if (dateFilter) list = list.filter(i => i.date === dateFilter);
    if (list.length === 0) { wrap.innerHTML = '<p class="empty-msg">No bills found.</p>'; return; }
    wrap.innerHTML = `
      <div class="table-wrap"><table class="data-table">
        <thead><tr><th>Invoice No</th><th>Date</th><th>Customer</th><th>Bike</th><th>Amount</th><th>Status</th><th></th></tr></thead>
        <tbody>
          ${list.map(i => `<tr>
            <td>${Utils.escapeHtml(i.invoiceNo)}</td>
            <td>${Utils.formatDate(i.date)}</td>
            <td>${Utils.escapeHtml(i.customerName)}</td>
            <td>${Utils.escapeHtml(i.bikeNumber)}</td>
            <td>${Utils.formatCurrency(i.grandTotal)}</td>
            <td><span class="badge ${i.status === 'pending' ? 'badge-danger' : 'badge-success'}">${i.status === 'pending' ? 'Pending' : 'Paid'}</span></td>
            <td class="row-actions">
              <button class="btn btn-sm btn-ghost" data-act="view" data-id="${i.id}">👁️</button>
              <button class="btn btn-sm btn-ghost" data-act="edit" data-id="${i.id}">✏️</button>
              <button class="btn btn-sm btn-ghost" data-act="dup" data-id="${i.id}">📄</button>
              <button class="btn btn-sm btn-ghost danger" data-act="del" data-id="${i.id}">🗑️</button>
            </td>
          </tr>`).join('')}
        </tbody>
      </table></div>
    `;
    wrap.querySelectorAll('[data-act="view"]').forEach(b => b.addEventListener('click', () => this.viewInvoice(b.dataset.id)));
    wrap.querySelectorAll('[data-act="edit"]').forEach(b => b.addEventListener('click', () => this.editInvoice(b.dataset.id)));
    wrap.querySelectorAll('[data-act="dup"]').forEach(b => b.addEventListener('click', () => this.duplicateInvoice(b.dataset.id)));
    wrap.querySelectorAll('[data-act="del"]').forEach(b => b.addEventListener('click', () => this.deleteInvoice(b.dataset.id)));
  },

  editInvoice(id) {
    const inv = Storage.getById(DB_KEYS.INVOICES, id);
    if (!inv) return;
    Router.navigate('newbill');
    setTimeout(() => this.renderNew(inv), 0);
  },

  async deleteInvoice(id) {
    const ok = await Utils.confirm('Delete this bill?', 'Delete');
    if (!ok) return;
    Storage.remove(DB_KEYS.INVOICES, id);
    Utils.toast('Bill deleted', 'success');
    this.renderHistoryTable();
  },

  duplicateInvoice(id) {
    const inv = Storage.getById(DB_KEYS.INVOICES, id);
    if (!inv) return;
    const copy = JSON.parse(JSON.stringify(inv));
    copy.id = null;
    copy.invoiceNo = null;
    copy.date = Utils.todayISO();
    copy.createdAt = null;
    Router.navigate('newbill');
    setTimeout(() => this.renderNew(copy), 0);
    Utils.toast('Bill duplicated - review and save', 'info');
  },

  viewInvoice(id, justSaved) {
    const inv = Storage.getById(DB_KEYS.INVOICES, id);
    if (!inv) return;
    const body = PDF.buildInvoiceHtml(inv);
    document.getElementById('formModalTitle').textContent = `Bill ${inv.invoiceNo}`;
    document.getElementById('formModalBody').innerHTML = `
      <div id="printableInvoice">${body}</div>
      <div class="modal-actions">
        <button type="button" class="btn btn-secondary" id="closeInvBtn">Close</button>
        <button type="button" class="btn btn-secondary" id="printInvBtn">🖨️ Print</button>
        <button type="button" class="btn btn-primary" id="pdfInvBtn">⬇️ Download PDF</button>
      </div>
    `;
    Utils.openModal('formModal');
    document.getElementById('closeInvBtn').addEventListener('click', () => Utils.closeModal('formModal'));
    document.getElementById('printInvBtn').addEventListener('click', () => PDF.printInvoice(inv));
    document.getElementById('pdfInvBtn').addEventListener('click', () => PDF.downloadInvoice(inv));
    if (justSaved) Utils.toast('Bill ready! You can print it now.', 'success');
  }
};

window.Billing = Billing;
