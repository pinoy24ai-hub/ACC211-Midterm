/* Merchandising General Ledger Workshop: PDF certificate (jsPDF + AutoTable, bundled in /vendor).
   Page 1: certificate and the student's multi-step income statement. Page 2: points for each entry. */
(function () {
  'use strict';

  const W = window.WorkshopEngine;
  const NAVY = [18, 53, 91];
  const TEAL = [15, 139, 141];
  const INK = [28, 39, 51];
  const MUTE = [93, 107, 122];

  // Standard PDF fonts only cover Latin-1, so swap typographic characters for plain ones.
  function t(s) {
    return String(s == null ? '' : s)
      .replace(/[‘’]/g, "'").replace(/[“”]/g, '"')
      .replace(/[–—−]/g, '-').replace(/×/g, 'x').replace(/[^\x00-\xFF]/g, '?');
  }

  // [label, amount, style] where style is '', 'ind', 'sub', 'grand', 'hd' or 'pct'.
  function statementRows(v) {
    const n = function (x, neg) { return x === 0 ? '-' : (neg ? '(' + W.num(x) + ')' : W.num(x)); };
    const d = function (x) { return (x < 0 ? '-' : '') + W.money(x); };
    const rows = [
      ['Sales', '', 'hd'],
      ['Sales revenue', d(v.rev), 'ind'],
      ['Less: Sales returns & allowances', n(v.ret, true), 'ind'],
      ['Less: Sales discounts', n(v.dis, true), 'ind'],
      ['Net sales', d(v.net), 'sub'],
      ['Cost of goods sold', n(v.cogs, true), 'ind'],
      ['Gross profit', d(v.gp), 'sub'],
      ['Gross profit margin', v.gm === null ? '-' : v.gm + '%', 'pct'],
      ['Operating expenses', '', 'hd'],
      ['Salaries expense', n(v.sal), 'ind'],
      ['Rent expense', n(v.rent), 'ind'],
      ['Delivery expense', n(v.del), 'ind']
    ];
    if (v.utl) rows.push(['Utilities expense', n(v.utl), 'ind']);
    rows.push(
      ['Total operating expenses', n(v.opx, true), 'sub'],
      ['Income from operations', d(v.ops), 'sub'],
      ['Other expenses', '', 'hd'],
      ['Interest expense', n(v.int, true), 'ind'],
      [v.ni < 0 ? 'Net loss' : 'Net income', d(v.ni), 'grand'],
      ['Net profit margin', v.nm === null ? '-' : v.nm + '%', 'pct']
    );
    return rows;
  }

  function download(S, si, certId, doneDate) {
    const jsPDF = window.jspdf.jsPDF;
    const doc = new jsPDF({ unit: 'pt', format: 'letter' });
    const Wd = doc.internal.pageSize.getWidth();
    const H = doc.internal.pageSize.getHeight();
    const cx = Wd / 2;

    // ---- Page 1: certificate ----
    doc.setDrawColor.apply(doc, NAVY).setLineWidth(4).rect(22, 22, Wd - 44, H - 44);
    doc.setLineWidth(1).rect(31, 31, Wd - 62, H - 62);

    let y = 74;
    doc.setTextColor.apply(doc, MUTE).setFont('helvetica', 'normal').setFontSize(9.5);
    doc.text("D'YOUVILLE UNIVERSITY  |  BUSINESS DEPARTMENT", cx, y, { align: 'center' });
    y += 38;
    doc.setTextColor.apply(doc, NAVY).setFont('times', 'bold').setFontSize(32);
    doc.text('Certificate of Completion', cx, y, { align: 'center' });
    y += 26;
    doc.setTextColor.apply(doc, INK).setFont('helvetica', 'normal').setFontSize(11.5);
    doc.text('This certifies that', cx, y, { align: 'center' });
    y += 36;
    doc.setTextColor.apply(doc, TEAL).setFont('times', 'bold').setFontSize(28);
    doc.text(t(S.name), cx, y, { align: 'center' });
    doc.setDrawColor.apply(doc, NAVY).setLineWidth(1).line(cx - 170, y + 9, cx + 170, y + 9);
    y += 30;
    doc.setTextColor.apply(doc, INK).setFont('helvetica', 'normal').setFontSize(11.5);
    doc.text('has successfully completed the', cx, y, { align: 'center' });
    y += 20;
    doc.setTextColor.apply(doc, NAVY).setFont('helvetica', 'bold').setFontSize(15);
    doc.text('Merchandising General Ledger Workshop', cx, y, { align: 'center' });
    y += 18;
    doc.setTextColor.apply(doc, INK).setFont('helvetica', 'normal').setFontSize(10.5);
    const blurb = doc.splitTextToSize('Journalizing merchandising transactions under the perpetual inventory system, posting to T-accounts and subsidiary ledgers, and preparing a multi-step income statement.', Wd - 200);
    doc.text(blurb, cx, y, { align: 'center', lineHeightFactor: 1.35 });
    y += blurb.length * 14 + 10;
    doc.setFont('helvetica', 'bold').setFontSize(13);
    doc.text('Final score: ' + si.pctAll + '%', cx, y, { align: 'center' });
    y += 24;

    // Income statement
    doc.setTextColor.apply(doc, NAVY).setFont('helvetica', 'bold').setFontSize(11);
    doc.text('Bright Mart', cx, y, { align: 'center' });
    doc.setTextColor.apply(doc, INK).setFontSize(10);
    doc.text('Multi-Step Income Statement', cx, y + 13, { align: 'center' });
    doc.setFont('helvetica', 'normal').setFontSize(9.5);
    doc.text(t(W.PERIOD), cx, y + 25, { align: 'center' });
    y += 31;

    const rows = statementRows(W.isValues(W.buildLedger(S.results)));
    const tw = 330;
    doc.autoTable({
      startY: y, margin: { left: (Wd - tw) / 2, right: (Wd - tw) / 2 }, tableWidth: tw, theme: 'plain',
      body: rows.map(function (r) { return [t(r[0]), r[1]]; }),
      styles: { fontSize: 9.5, cellPadding: { top: 1.6, bottom: 1.6, left: 4, right: 4 }, textColor: INK },
      columnStyles: { 1: { halign: 'right', cellWidth: 80 } },
      didParseCell: function (d) {
        const s = rows[d.row.index][2];
        if (s === 'hd') { d.cell.styles.fontStyle = 'bold'; d.cell.styles.textColor = NAVY; }
        if (s === 'sub' || s === 'grand') d.cell.styles.fontStyle = 'bold';
        if (s === 'grand') d.cell.styles.cellPadding = { top: 2, bottom: 6, left: 4, right: 4 };
        if (s === 'pct') { d.cell.styles.fontStyle = 'italic'; d.cell.styles.textColor = TEAL; d.cell.styles.fontSize = 8.5; }
        if ((s === 'ind' || s === 'pct') && d.column.index === 0) d.cell.styles.cellPadding = { top: 1.6, bottom: 1.6, left: 18, right: 4 };
      },
      didDrawCell: function (d) {
        const s = rows[d.row.index][2];
        if (s !== 'sub' && s !== 'grand') return;
        doc.setDrawColor.apply(doc, INK).setLineWidth(0.8);
        doc.line(d.cell.x, d.cell.y, d.cell.x + d.cell.width, d.cell.y);
        if (s === 'grand') {
          const yb = d.cell.y + d.cell.height - 3.5;
          doc.line(d.cell.x, yb, d.cell.x + d.cell.width, yb);
          doc.line(d.cell.x, yb + 2.2, d.cell.x + d.cell.width, yb + 2.2);
        }
      }
    });

    // Signature lines
    const sy = H - 92;
    doc.setDrawColor.apply(doc, INK).setLineWidth(0.7);
    doc.line(cx - 220, sy, cx - 40, sy);
    doc.line(cx + 40, sy, cx + 220, sy);
    doc.setTextColor.apply(doc, INK).setFont('helvetica', 'normal').setFontSize(10);
    doc.text('Date: ' + t(doneDate), cx - 130, sy + 14, { align: 'center' });
    doc.text('Prof. Elf, Instructor', cx + 130, sy + 14, { align: 'center' });
    doc.setTextColor.apply(doc, MUTE).setFontSize(8.5);
    doc.text('Certificate ID ' + certId, cx, H - 48, { align: 'center' });

    // ---- Page 2: points per entry ----
    doc.addPage();
    doc.setTextColor.apply(doc, NAVY).setFont('helvetica', 'bold').setFontSize(16);
    doc.text('Workshop Results', 48, 60);
    doc.setTextColor.apply(doc, INK).setFont('helvetica', 'normal').setFontSize(10.5);
    doc.text(t(S.name) + '   |   Final score ' + si.pctAll + '% (' + si.sum.toFixed(2) + ' of ' + W.N + ' points)   |   Passing score ' + W.PASS + '%', 48, 80);
    doc.text('Completed ' + t(doneDate) + '   |   Certificate ID ' + certId, 48, 96);
    doc.autoTable({
      startY: 112, margin: { left: 48, right: 48 }, theme: 'grid',
      head: [['Entry', 'Date', 'Transaction', 'Points', 'Notes']],
      body: W.E.map(function (e, i) {
        const r = S.results[i];
        return [e.id, e.date, t(e.text), r.credit.toFixed(2) + ' / 1',
          r.revealed ? 'Answer shown' : (r.wrong || r.hints ? r.wrong + ' wrong, ' + r.hints + ' hint(s)' : 'First try')];
      }),
      foot: [['', '', 'Total', si.sum.toFixed(2) + ' / ' + W.N, si.pctAll + '%']],
      headStyles: { fillColor: NAVY, textColor: [255, 255, 255] },
      footStyles: { fillColor: [227, 244, 244], textColor: INK, fontStyle: 'bold' },
      styles: { fontSize: 9, textColor: INK, cellPadding: 4 },
      columnStyles: { 0: { cellWidth: 36, halign: 'center' }, 1: { cellWidth: 48 }, 3: { cellWidth: 52, halign: 'right' }, 4: { cellWidth: 92 } }
    });
    doc.setTextColor.apply(doc, MUTE).setFontSize(8.5);
    doc.text(doc.splitTextToSize('Scoring: each entry is worth 1 point. Each wrong check costs 0.25 and each hint costs 0.1, with a minimum of 0.25 for a correct entry. Choosing "Show me the answer" earns 0 points for that entry.', Wd - 96), 48, doc.lastAutoTable.finalY + 18);

    doc.save('Certificate_GL_Workshop_' + S.name.replace(/[^A-Za-z0-9]+/g, '_').replace(/^_|_$/g, '') + '.pdf');
  }

  window.WorkshopReport = { download: download };
})();
