/* ACC 211 Part 3 practice: PDF certificate plus the financial statements (jsPDF + AutoTable in /vendor). */
(function () {
  'use strict';

  const E = window.Part3Engine;
  const BRAND = [31, 78, 121], INK = [27, 37, 51], MUTED = [107, 119, 137], GOLD = [200, 134, 42];

  // Standard PDF fonts only cover Latin-1, so swap typographic characters for plain ones.
  function t(s) {
    return String(s == null ? '' : s)
      .replace(/[‘’]/g, "'").replace(/[“”]/g, '"')
      .replace(/[–—−]/g, '-').replace(/[^\x00-\xFF]/g, '?');
  }

  function certificate(doc, state, check, checks) {
    const W = doc.internal.pageSize.getWidth(), H = doc.internal.pageSize.getHeight();
    const B = E.BIZ, n = E.ACCOUNTS.length;
    doc.setDrawColor.apply(doc, BRAND).setLineWidth(6).rect(24, 24, W - 48, H - 48);
    doc.setDrawColor.apply(doc, GOLD).setLineWidth(1.5).rect(36, 36, W - 72, H - 72);
    const c = W / 2;
    doc.setTextColor.apply(doc, BRAND).setFont('helvetica', 'bold').setFontSize(13);
    doc.text('ACC 211  |  PRINCIPLES OF ACCOUNTING', c, 92, { align: 'center' });
    doc.setFont('times', 'bold').setFontSize(40).setTextColor.apply(doc, INK);
    doc.text('Certificate of Completion', c, 150, { align: 'center' });
    doc.setFont('helvetica', 'normal').setFontSize(13).setTextColor.apply(doc, MUTED);
    doc.text('This certifies that', c, 196, { align: 'center' });
    doc.setFont('times', 'bolditalic').setFontSize(34).setTextColor.apply(doc, BRAND);
    doc.text(t(state.name), c, 244, { align: 'center' });
    doc.setDrawColor.apply(doc, GOLD).setLineWidth(1).line(c - 200, 256, c + 200, 256);
    doc.setFont('helvetica', 'normal').setFontSize(13).setTextColor.apply(doc, INK);
    doc.text(doc.splitTextToSize('correctly classified all ' + n + ' accounts on the adjusted trial balance of ' + t(B.name) +
      ', a merchandising business using the perpetual inventory system, and calculated every subtotal and total on its multiple-step income statement, ' +
      'statement of owner\'s equity, and classified balance sheet for the year ended December 31, ' + B.year + '.', W - 260), c, 290, { align: 'center' });

    const done = state.finishedAt ? new Date(state.finishedAt) : new Date();
    const y = H - 128;
    doc.setFontSize(10.5).setTextColor.apply(doc, MUTED);
    // First-check results per task, then the usual details.
    doc.setFont('helvetica', 'normal').setFontSize(10).setTextColor.apply(doc, MUTED);
    doc.text('FIRST-CHECK RESULTS', c, y - 62, { align: 'center' });
    doc.setFont('helvetica', 'bold').setTextColor.apply(doc, INK);
    doc.text(t(E.TASKS.map((tk, i) => 'Task ' + (i + 1) + ' ' + tk.short + ': ' + (state.first[tk.id] || 0) + '/' + E.taskTotal(tk.id)).join('     ')), c, y - 46, { align: 'center' });
    const cols = [['Completed', done.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })],
      ['Checks used', String(checks)],
      ['Certificate ID', state.id], ['Check code', check]];
    const step = (W - 160) / cols.length;
    cols.forEach((col, i) => {
      const x = 80 + step * i + step / 2;
      doc.setFont('helvetica', 'normal').setTextColor.apply(doc, MUTED).text(col[0].toUpperCase(), x, y, { align: 'center' });
      doc.setFont('helvetica', 'bold').setTextColor.apply(doc, INK).text(t(col[1]), x, y + 16, { align: 'center' });
    });
    doc.setFont('helvetica', 'normal').setFontSize(9).setTextColor.apply(doc, MUTED);
    doc.text('Upload this PDF to Canvas. The financial statements follow on the next pages.', c, H - 58, { align: 'center' });
  }

  function statementPage(doc, S) {
    doc.addPage('letter', 'portrait');
    const M = 54, B = E.BIZ;
    doc.setTextColor.apply(doc, INK).setFont('helvetica', 'bold').setFontSize(13);
    const W = doc.internal.pageSize.getWidth();
    doc.text(t(B.name), W / 2, M, { align: 'center' });
    doc.text(t(S.title), W / 2, M + 17, { align: 'center' });
    doc.setFont('helvetica', 'normal').setFontSize(11);
    doc.text(t(S.date), W / 2, M + 33, { align: 'center' });
    const body = S.rows.map(r => r.kind === 'big' ? [{ content: t(r.label), colSpan: 4 }] : [t('    '.repeat(r.ind) + r.label)].concat(r.amts.map(v => v == null ? '' : (r.kind === 'grand' ? '$' : '') + E.plain(v))));
    doc.autoTable({
      startY: M + 46, margin: { left: M, right: M }, theme: 'plain', body,
      styles: { fontSize: 10, textColor: INK, cellPadding: { top: 2.5, bottom: 2.5, left: 4, right: 6 } },
      columnStyles: { 1: { cellWidth: 82, halign: 'right' }, 2: { cellWidth: 82, halign: 'right' }, 3: { cellWidth: 82, halign: 'right' } },
      didParseCell: d => {
        const r = S.rows[d.row.index];
        if (r.kind === 'grand' || r.kind === 'big') d.cell.styles.fontStyle = 'bold';
        if (r.kind === 'hdr' && d.column.index === 0) d.cell.styles.fontStyle = 'bold';
        if (r.kind === 'big' && d.column.index === 0) { d.cell.styles.textColor = BRAND; d.cell.styles.halign = 'center'; }
      },
      didDrawCell: d => {
        if (d.section !== 'body' || d.column.index === 0) return;
        const r = S.rows[d.row.index], i = d.column.index - 1;
        const x1 = d.cell.x + 10, x2 = d.cell.x + d.cell.width - 2, yb = d.cell.y + d.cell.height - 1;
        doc.setDrawColor.apply(doc, INK).setLineWidth(0.7);
        if (r.ul[i]) doc.line(x1, yb, x2, yb);
        if (r.dbl[i]) { doc.line(x1, yb - 1.5, x2, yb - 1.5); doc.line(x1, yb + 1, x2, yb + 1); }
      }
    });
  }

  function download(state, statements, check, checks) {
    const doc = new window.jspdf.jsPDF({ unit: 'pt', format: 'letter', orientation: 'landscape' });
    certificate(doc, state, check, checks);
    ['is', 'soe', 'bs'].forEach(k => statementPage(doc, statements[k]));
    const pages = doc.getNumberOfPages();
    for (let p = 2; p <= pages; p++) {
      doc.setPage(p);
      const W = doc.internal.pageSize.getWidth(), H = doc.internal.pageSize.getHeight();
      doc.setFont('helvetica', 'normal').setFontSize(8).setTextColor.apply(doc, MUTED);
      doc.text(t(state.name) + '  |  ACC 211 Merchandising Statements Practice  |  Certificate ' + state.id + '  |  Check ' + check, 54, H - 28);
      doc.text('Page ' + p + ' of ' + pages, W - 54, H - 28, { align: 'right' });
    }
    const safe = t(state.name).replace(/[^A-Za-z0-9]+/g, '_').replace(/^_|_$/g, '');
    doc.save('ACC211_Merch_Statements_Certificate_' + (safe || 'Student') + '.pdf');
  }

  window.Part3Report = { download };
})();
