/* ============================================================
   pdf.js — Printable Invoice HTML, Print, PDF Download
   Uses jsPDF + html2canvas (loaded via CDN in index.html)
   All labels are in English. Item/service descriptions are
   shown exactly as the workshop entered them (may be in Tamil).
   ============================================================ */

const PDF = {
  buildInvoiceHtml(inv) {
    const s = Storage.getSettings();
    const partsRows = (inv.parts || []).map(p =>
      `<tr><td>${Utils.escapeHtml(p.name)}</td><td class="num">${p.qty}</td><td class="num">${Utils.formatCurrency(p.price)}</td><td class="num">${Utils.formatCurrency(p.qty * p.price)}</td></tr>`
    ).join('');
    const oilRows = (inv.oils || []).map(o => `<tr><td>${Utils.escapeHtml(o.brand)}</td><td class="num">${o.qty} L</td><td class="num">${Utils.formatCurrency(o.price)}</td><td class="num">${Utils.formatCurrency(o.qty * o.price)}</td></tr>`).join('');
    const labourRows = (inv.labour || []).map(l => `<tr><td>${Utils.escapeHtml(l.name)}</td><td class="num">${Utils.formatCurrency(l.price)}</td></tr>`).join('');
    const chargeRows = (inv.charges || []).map(c => `<tr><td>${Utils.escapeHtml(c.name)}</td><td class="num">${Utils.formatCurrency(c.price)}</td></tr>`).join('');

    return `
    <div class="invoice-doc">
      <div class="inv-header">
        ${s.logo ? `<img src="${s.logo}" class="inv-logo">` : ''}
        <div class="inv-header-text">
          <h2>${Utils.escapeHtml(s.workshopName || 'Siva Sakthi')}</h2>
          <p>${Utils.escapeHtml(s.address || '')}</p>
          <p>📞 ${Utils.escapeHtml(s.phone || '')}</p>
        </div>
        <div class="inv-meta">
          <p><b>Invoice No:</b> ${Utils.escapeHtml(inv.invoiceNo)}</p>
          <p><b>Date:</b> ${Utils.formatDate(inv.date)}</p>
          <p><b>Status:</b> ${inv.status === 'pending' ? 'Pending' : 'Paid'}</p>
        </div>
      </div>
      <hr>
      <div class="inv-customer">
        <div><b>Customer Name:</b> ${Utils.escapeHtml(inv.customerName)} ${inv.phone ? '| 📞 ' + Utils.escapeHtml(inv.phone) : ''}</div>
        <div><b>Bike Number:</b> ${Utils.escapeHtml(inv.bikeNumber)} ${inv.bikeModel ? '(' + Utils.escapeHtml(inv.bikeModel) + ')' : ''} | <b>Kilometers:</b> ${Utils.escapeHtml(inv.km || '-')}</div>
        ${inv.problem ? `<div><b>Problem Description:</b> ${Utils.escapeHtml(inv.problem)}</div>` : ''}
        ${inv.mechanicName || inv.deliveryDate ? `<div>${inv.mechanicName ? '<b>Mechanic:</b> ' + Utils.escapeHtml(inv.mechanicName) : ''} ${inv.deliveryDate ? ' | <b>Delivery Date:</b> ' + Utils.formatDate(inv.deliveryDate) : ''}</div>` : ''}
      </div>

      ${partsRows ? `<h4>Spare Parts</h4><table class="inv-table"><colgroup><col><col class="col-num"><col class="col-num"><col class="col-num"></colgroup><thead><tr><th>Description</th><th class="num">Quantity</th><th class="num">Unit Price</th><th class="num">Amount</th></tr></thead><tbody>${partsRows}</tbody></table>` : ''}
      ${oilRows ? `<h4>Engine Oil</h4><table class="inv-table"><colgroup><col><col class="col-num"><col class="col-num"><col class="col-num"></colgroup><thead><tr><th>Description</th><th class="num">Quantity</th><th class="num">Unit Price</th><th class="num">Amount</th></tr></thead><tbody>${oilRows}</tbody></table>` : ''}
      ${labourRows ? `<h4>Labour Charges</h4><table class="inv-table"><colgroup><col><col class="col-num"></colgroup><thead><tr><th>Description</th><th class="num">Amount</th></tr></thead><tbody>${labourRows}</tbody></table>` : ''}
      ${inv.waterWash ? `<h4>Water Wash Charge</h4><table class="inv-table"><colgroup><col><col class="col-num"></colgroup><tbody><tr><td>Water Wash</td><td class="num">${Utils.formatCurrency(inv.waterWash)}</td></tr></tbody></table>` : ''}
      ${chargeRows ? `<h4>Other Charges</h4><table class="inv-table"><colgroup><col><col class="col-num"></colgroup><thead><tr><th>Description</th><th class="num">Amount</th></tr></thead><tbody>${chargeRows}</tbody></table>` : ''}

      <div class="inv-totals">
        <div><span>Subtotal</span><span>${Utils.formatCurrency(inv.subTotal)}</span></div>
        <div><span>Discount</span><span>- ${Utils.formatCurrency(inv.discount)}</span></div>
        <div class="inv-grand"><span>Grand Total</span><span>${Utils.formatCurrency(inv.grandTotal)}</span></div>
      </div>

      <div class="inv-signatures">
        <div>_________________________<br>Customer Signature</div>
        <div>_________________________<br>Workshop Signature</div>
      </div>
      <p class="inv-thanks">${Utils.escapeHtml(s.thankYouMsg || 'Thank you! Visit again.')}</p>
    </div>
    `;
  },

  printInvoice(inv) {
    const html = this.buildInvoiceHtml(inv);
    const win = window.open('', '_blank', 'width=800,height=900');
    win.document.write(`
      <html><head><title>${Utils.escapeHtml(inv.invoiceNo)}</title>
      <style>${this.printStyles()}</style></head>
      <body>${html}<script>window.onload=()=>{window.print();}</script></body></html>
    `);
    win.document.close();
  },

  async downloadInvoice(inv) {
    if (!window.jspdf || !window.html2canvas) {
      Utils.toast('PDF module not loaded. An internet connection may be required.', 'warning');
      return;
    }
    Utils.toast('Preparing PDF...', 'info');
    const container = document.createElement('div');
    container.style.position = 'fixed';
    container.style.left = '-9999px';
    container.style.width = '780px';
    container.style.background = '#fff';
    container.innerHTML = `<style>${this.printStyles()}</style>${this.buildInvoiceHtml(inv)}`;
    document.body.appendChild(container);

    try {
      const canvas = await html2canvas(container, { scale: 2, backgroundColor: '#ffffff' });
      const imgData = canvas.toDataURL('image/png');
      const { jsPDF } = window.jspdf;
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageWidth = 210;
      const imgWidth = pageWidth;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;
      let position = 0;
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= 297;
      while (heightLeft > 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= 297;
      }
      pdf.save(`${inv.invoiceNo}.pdf`);
      Utils.toast('PDF downloaded', 'success');
    } catch (err) {
      console.error(err);
      Utils.toast('Error generating PDF', 'error');
    } finally {
      document.body.removeChild(container);
    }
  },

  printStyles() {
    return `
      body{font-family:'Noto Sans Tamil','Poppins',sans-serif;color:#1a1a2e;padding:20px;}
      .invoice-doc{max-width:760px;margin:0 auto;}
      .inv-header{display:flex;align-items:flex-start;gap:16px;}
      .inv-logo{width:60px;height:60px;object-fit:contain;border-radius:8px;flex-shrink:0;}
      .inv-header-text{flex:1 1 auto;}
      .inv-header-text h2{margin:0 0 4px;color:#2541D6;}
      .inv-header-text p{margin:2px 0;font-size:12px;color:#555;}
      .inv-meta{flex:0 0 auto;min-width:150px;text-align:right;font-size:13px;}
      .inv-meta p{margin:2px 0;}
      hr{border:none;border-top:2px solid #2541D6;margin:12px 0;}
      .inv-customer div{margin:4px 0;font-size:13px;}
      h4{color:#FF8A3D;margin:14px 0 6px;font-size:14px;}
      .inv-table{width:100%;border-collapse:collapse;font-size:12px;margin-bottom:8px;table-layout:fixed;}
      .inv-table th,.inv-table td{border:1px solid #ddd;padding:8px 10px;text-align:left;vertical-align:middle;word-break:break-word;}
      .inv-table th{background:#f0f3ff;}
      .inv-table th.num,.inv-table td.num{text-align:right;font-variant-numeric:tabular-nums;}
      .inv-table .col-num{width:18%;}
      .inv-totals{margin-top:16px;margin-left:auto;width:280px;font-size:13px;}
      .inv-totals div{display:flex;justify-content:space-between;padding:4px 0;}
      .inv-grand{font-weight:700;font-size:16px;border-top:2px solid #2541D6;color:#2541D6;padding-top:8px !important;}
      .inv-signatures{display:flex;justify-content:space-between;margin-top:60px;font-size:12px;text-align:center;}
      .inv-thanks{text-align:center;margin-top:24px;font-style:italic;color:#666;}
      @media print { body{padding:0;} }
    `;
  }
};

window.PDF = PDF;
