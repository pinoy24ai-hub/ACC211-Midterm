/* Journal entry quiz: save the correct entries as a PDF (jsPDF + AutoTable, bundled in /vendor). */
(function () {
  'use strict';

  const NAVY = [18, 53, 91];
  const INK = [28, 39, 51];
  const MUTE = [93, 107, 122];

  // Standard PDF fonts only cover Latin-1, so swap typographic characters for plain ones.
  function t(s) {
    return String(s == null ? '' : s)
      .replace(/[‘’]/g, "'").replace(/[“”]/g, '"')
      .replace(/[–—−]/g, '-').replace(/×/g, 'x').replace(/[^\x00-\xFF]/g, '?');
  }
  const num = function (n) { return n ? n.toLocaleString('en-US') : ''; };

  // Journal rows: [date, account, debit, credit, kind] where kind is 'dr', 'cr', 'none' or 'memo'.
  function journalRows(Q) {
    const rows = [];
    Q.forEach(function (q) {
      if (q.correct === null) {
        rows.push([q.date, 'No entry required', '', '', 'none']);
      } else {
        const parts = Array.isArray(q.correct[0]) ? q.correct : [q.correct];
        parts.forEach(function (lines) {
          const ordered = lines.filter(function (l) { return l.dr; }).concat(lines.filter(function (l) { return l.cr; }));
          ordered.forEach(function (l, j) { rows.push([j === 0 ? q.date : '', t(l.a), num(l.dr), num(l.cr), l.dr ? 'dr' : 'cr']); });
        });
      }
      rows.push(['', '(' + t(q.text) + (q.note ? ' Note: ' + t(q.note) : '') + ')', '', '', 'memo']);
    });
    return rows;
  }

  function save(Q, OPENING, META) {
    const jsPDF = window.jspdf.jsPDF;
    const doc = new jsPDF({ unit: 'pt', format: 'letter' });
    const W = doc.internal.pageSize.getWidth();
    const M = 48;

    doc.setFillColor.apply(doc, NAVY).rect(0, 0, W, 64, 'F');
    doc.setTextColor(255, 255, 255).setFont('helvetica', 'bold').setFontSize(16);
    doc.text(t(META.business) + ': Correct Journal Entries', M, 32);
    doc.setFont('helvetica', 'normal').setFontSize(10);
    doc.text(META.month + ' ' + META.year + '  |  Perpetual inventory system' + (META.owner ? '  |  ' + t(META.owner) + ', owner' : ''), M, 49);

    doc.setTextColor.apply(doc, INK).setFontSize(10);
    doc.text(doc.splitTextToSize('Use these entries to complete ' + t(META.practice) + '. Sales and sales returns are recorded as two entries: revenue at selling price first, then cost of goods sold at cost.' +
      (OPENING.length ? '' : ' The books start with no opening balances.'), W - 2 * M), M, 86);

    if (OPENING.length) doc.autoTable({
      startY: 112, margin: { left: M, right: M }, theme: 'grid', tableWidth: 330,
      head: [['Opening balances, ' + META.openingDate + ' (given)', 'Debit', 'Credit']],
      body: OPENING.map(function (r) { return [t(r[0]), num(r[1]), num(r[2])]; }),
      foot: [['Totals', num(OPENING.reduce(function (s, r) { return s + r[1]; }, 0)), num(OPENING.reduce(function (s, r) { return s + r[2]; }, 0))]],
      headStyles: { fillColor: NAVY, textColor: [255, 255, 255] },
      footStyles: { fillColor: [238, 242, 247], textColor: INK, fontStyle: 'bold' },
      styles: { fontSize: 9, textColor: INK, cellPadding: 3 },
      columnStyles: { 1: { halign: 'right', cellWidth: 60 }, 2: { halign: 'right', cellWidth: 60 } },
      didParseCell: function (d) { if (d.section !== 'body' && d.column.index > 0) d.cell.styles.halign = 'right'; }
    });

    const rows = journalRows(Q);
    doc.autoTable({
      startY: OPENING.length ? doc.lastAutoTable.finalY + 18 : 120, margin: { left: M, right: M }, theme: 'plain',
      head: [['Date', 'Account Titles and Explanation', 'Debit', 'Credit']],
      body: rows.map(function (r) { return r.slice(0, 4); }),
      headStyles: { fillColor: NAVY, textColor: [255, 255, 255] },
      styles: { fontSize: 9, textColor: INK, cellPadding: { top: 2.5, bottom: 2.5, left: 5, right: 5 } },
      columnStyles: { 0: { cellWidth: 52 }, 2: { halign: 'right', cellWidth: 62 }, 3: { halign: 'right', cellWidth: 62 } },
      didParseCell: function (d) {
        if (d.section === 'head') { if (d.column.index > 1) d.cell.styles.halign = 'right'; return; }
        const kind = rows[d.row.index][4];
        if (d.column.index === 1 && kind === 'cr') d.cell.styles.cellPadding = { top: 2.5, bottom: 2.5, left: 28, right: 5 };
        if (kind === 'none' && d.column.index === 1) d.cell.styles.fontStyle = 'italic';
        if (kind === 'memo') { d.cell.styles.fontStyle = 'italic'; d.cell.styles.textColor = MUTE; d.cell.styles.fontSize = 8; d.cell.styles.cellPadding = { top: 1, bottom: 7, left: 5, right: 5 }; }
      },
      didDrawCell: function (d) {
        if (d.section !== 'body' || rows[d.row.index][4] !== 'memo') return;
        doc.setDrawColor(210, 217, 226).setLineWidth(0.6);
        doc.line(d.cell.x, d.cell.y + d.cell.height, d.cell.x + d.cell.width, d.cell.y + d.cell.height);
      }
    });

    const pages = doc.internal.getNumberOfPages();
    for (let p = 1; p <= pages; p++) {
      doc.setPage(p);
      doc.setTextColor.apply(doc, MUTE).setFontSize(8);
      doc.text('ACC 211  |  ' + t(META.quiz) + ' answer key  |  Page ' + p + ' of ' + pages, W / 2, doc.internal.pageSize.getHeight() - 24, { align: 'center' });
    }
    doc.save(META.pdfName);
  }

  window.QuizPdf = { save: save, journalRows: journalRows };
})();
