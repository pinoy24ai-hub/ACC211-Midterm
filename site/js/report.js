/* ACC 211 Midterm: PDF score report (jsPDF + AutoTable, bundled in /vendor). */
(function () {
  'use strict';

  const E = window.ExamEngine;
  const BRAND = [31, 78, 121];
  const INK = [27, 37, 51];
  const MUTED = [107, 119, 137];

  // Standard PDF fonts only cover Latin-1, so swap typographic characters for plain ones.
  function t(s) {
    return String(s == null ? '' : s)
      .replace(/[‘’]/g, "'").replace(/[“”]/g, '"')
      .replace(/[–—]/g, '-').replace(/[^\x00-\xFF]/g, '?');
  }
  function amt(n) { return n ? E.money(n) : ''; }

  function download(exam, state, result, check) {
    const jsPDF = window.jspdf.jsPDF;
    const doc = new jsPDF({ unit: 'pt', format: 'letter' });
    const W = doc.internal.pageSize.getWidth();
    const M = 48;
    let y = M;

    const acct = function (no) { return exam.accounts[no] ? no + ' ' + exam.accounts[no].name : (no || '(no account)'); };

    // ---- Header ----
    doc.setFillColor.apply(doc, BRAND);
    doc.rect(0, 0, W, 70, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold').setFontSize(18);
    doc.text('ACC 211 Midterm Exam: Score Report', M, 34);
    doc.setFont('helvetica', 'normal').setFontSize(10);
    doc.text('The Accounting Cycle: Journal, Adjusting and Closing Entries', M, 52);
    y = 98;

    doc.setTextColor.apply(doc, INK);
    doc.setFont('helvetica', 'bold').setFontSize(22);
    doc.text(t(state.name), M, y);
    y += 10;

    const meta = [
      ['Attempt', String(state.attempt || 1)],
      ['Version code', state.code],
      ['Check code', check],
      ['Business', exam.business.name + ' (' + exam.owner + ', owner)'],
      ['Started', new Date(state.startedAt).toLocaleString()],
      ['Submitted', new Date(state.finishedAt).toLocaleString()]
    ];
    doc.autoTable({
      startY: y + 6, margin: { left: M, right: M }, theme: 'plain',
      body: meta.map(function (r) { return [t(r[0]), t(r[1])]; }),
      styles: { fontSize: 10, cellPadding: 2, textColor: INK },
      columnStyles: { 0: { cellWidth: 90, textColor: MUTED } }
    });
    y = doc.lastAutoTable.finalY + 14;

    // ---- Score summary ----
    doc.autoTable({
      startY: y, margin: { left: M, right: M }, theme: 'grid',
      head: [['Phase', 'Score', 'Possible']],
      body: [
        ['Phase 1: General Journal Entries (10 transactions)', result.phase1.score.toFixed(2), result.phase1.possible],
        ['Phase 2: Adjusting Entries (6 adjustments)', result.phase2.score.toFixed(2), result.phase2.possible],
        ['Phase 3: Closing Entries (4 steps)', result.phase3.score.toFixed(2), result.phase3.possible]
      ],
      foot: [['Total', result.total.toFixed(2), result.possible]],
      headStyles: { fillColor: BRAND },
      footStyles: { fillColor: [231, 239, 248], textColor: INK, fontStyle: 'bold' },
      styles: { fontSize: 11, textColor: INK },
      columnStyles: { 1: { halign: 'right', cellWidth: 70 }, 2: { halign: 'right', cellWidth: 70 } },
      didParseCell: function (d) { if (d.section !== 'body' && d.column.index > 0) d.cell.styles.halign = 'right'; }
    });
    y = doc.lastAutoTable.finalY + 20;

    doc.setFont('helvetica', 'normal').setFontSize(9).setTextColor.apply(doc, MUTED);
    doc.text(doc.splitTextToSize('Upload this PDF to the Canvas assignment. If you take the exam more than once, your highest attempt counts. The pages that follow list every response you entered. ' +
      'Scoring: journal lines earn credit for the correct account, side and amount; each closing entry earns credit for selecting every account in the entry (both sides) and for the amount transferred.', W - 2 * M), M, y);

    // ---- Detail pages ----
    function section(title, subtitle) {
      doc.addPage();
      y = M;
      doc.setTextColor.apply(doc, BRAND);
      doc.setFont('helvetica', 'bold').setFontSize(15);
      doc.text(t(title), M, y);
      y += 16;
      if (subtitle) {
        doc.setTextColor.apply(doc, MUTED).setFont('helvetica', 'normal').setFontSize(9.5);
        const lines = doc.splitTextToSize(t(subtitle), W - 2 * M);
        doc.text(lines, M, y);
        y += lines.length * 12;
      }
      y += 6;
    }

    function entryBlock(label, prompt, rows, earned, points) {
      const lines = E.normalizeLines(rows);
      const body = lines.length
        ? lines.map(function (l) {
            if (l.invalid) return [t(acct(l.acct)) + '  (incomplete line)', '', ''];
            return [(l.side === 'cr' ? '      ' : '') + t(acct(l.acct)), l.side === 'dr' ? amt(l.amount) : '', l.side === 'cr' ? amt(l.amount) : ''];
          })
        : [['(no entry)', '', '']];
      doc.autoTable({
        startY: y, margin: { left: M, right: M }, theme: 'grid',
        head: [[{ content: t(label) + '   ' + t(prompt), colSpan: 2, styles: { halign: 'left' } },
          { content: earned.toFixed(2) + ' / ' + points + ' pts', styles: { halign: 'right' } }],
        ['Account', 'Debit', 'Credit']],
        body: body,
        rowPageBreak: 'avoid',
        styles: { fontSize: 9.5, textColor: INK, cellPadding: 4 },
        headStyles: { fillColor: [244, 246, 249], textColor: INK, fontStyle: 'normal' },
        columnStyles: { 1: { halign: 'right', cellWidth: 90 }, 2: { halign: 'right', cellWidth: 90 } },
        didParseCell: function (d) {
          if (d.section === 'head' && d.row.index === 1) { d.cell.styles.fontStyle = 'bold'; d.cell.styles.fillColor = [255, 255, 255]; if (d.column.index > 0) d.cell.styles.halign = 'right'; }
        }
      });
      y = doc.lastAutoTable.finalY + 10;
    }

    section('Phase 1: General Journal Entries', exam.business.name + ', ' + exam.phase1.month + ' ' + exam.phase1.year +
      '. Score: ' + result.phase1.score.toFixed(2) + ' / ' + result.phase1.possible);
    exam.phase1.transactions.forEach(function (tx, i) {
      entryBlock((i + 1) + '. ' + tx.date + ':', tx.text, state.answers.p1[tx.id], result.phase1.items[i].earned, tx.points);
    });

    section('Phase 2: Adjusting Entries', 'Based on the unadjusted trial balance dated ' + exam.phase2.date +
      '. Score: ' + result.phase2.score.toFixed(2) + ' / ' + result.phase2.possible);
    exam.phase2.items.forEach(function (it, i) {
      entryBlock('Adjustment ' + (i + 1) + ':', it.text, state.answers.p2[it.id], result.phase2.items[i].earned, it.points);
    });

    section('Phase 3: Closing Entries', 'Closing routine run on the adjusted balances dated ' + exam.phase3.date +
      '. Score: ' + result.phase3.score.toFixed(2) + ' / ' + result.phase3.possible);
    const bal = E.atbBalances(exam.phase3);
    exam.phase3.steps.forEach(function (s, i) {
      const selected = (state.answers.p3.selections || [])[i] || [];
      const keyed = ((state.answers.p3.amounts || [])[i]) || '';
      const lines = E.applyClosing(bal, selected, keyed).lines;
      const item = result.phase3.items[i];
      const info = 'Accounts selected: ' + (selected.length ? selected.map(function (no) { return t(acct(no)); }).join('; ') : '(none)') +
        '\nAmount entered: ' + (keyed ? t(keyed) : '(none)') +
        '\nAccounts ' + item.accountPts.toFixed(2) + ' / 4.00  |  Amount ' + item.amountPts.toFixed(2) + ' / 2.00';
      const body = [[{ content: info, colSpan: 3, styles: { fontStyle: 'italic', textColor: MUTED } }]]
        .concat(lines.length
          ? lines.map(function (l) { return [(l.side === 'cr' ? '      ' : '') + t(acct(l.acct)), l.side === 'dr' ? amt(l.amount) : '', l.side === 'cr' ? amt(l.amount) : '']; })
          : [['(no amounts transferred)', '', '']]);
      doc.autoTable({
        startY: y, margin: { left: M, right: M }, theme: 'grid',
        head: [[{ content: 'Closing entry ' + (i + 1), colSpan: 2 },
          { content: item.earned.toFixed(2) + ' / ' + s.points + ' pts', styles: { halign: 'right' } }],
        ['Posted entry', 'Debit', 'Credit']],
        body: body,
        rowPageBreak: 'avoid',
        styles: { fontSize: 9.5, textColor: INK, cellPadding: 4 },
        headStyles: { fillColor: [244, 246, 249], textColor: INK, fontStyle: 'normal' },
        columnStyles: { 1: { halign: 'right', cellWidth: 90 }, 2: { halign: 'right', cellWidth: 90 } },
        didParseCell: function (d) {
          if (d.section === 'head' && d.row.index === 1) { d.cell.styles.fontStyle = 'bold'; d.cell.styles.fillColor = [255, 255, 255]; if (d.column.index > 0) d.cell.styles.halign = 'right'; }
        }
      });
      y = doc.lastAutoTable.finalY + 10;
    });

    // ---- Footer on every page ----
    const pages = doc.getNumberOfPages();
    const H = doc.internal.pageSize.getHeight();
    for (let p = 1; p <= pages; p++) {
      doc.setPage(p);
      doc.setFont('helvetica', 'normal').setFontSize(8).setTextColor.apply(doc, MUTED);
      doc.text(t(state.name) + '  |  Attempt ' + (state.attempt || 1) + '  |  Version ' + state.code + '  |  Check ' + check, M, H - 24);
      doc.text('Page ' + p + ' of ' + pages, W - M, H - 24, { align: 'right' });
    }

    const safe = t(state.name).replace(/[^A-Za-z0-9]+/g, '_').replace(/^_|_$/g, '');
    doc.save('ACC211_Midterm_' + (safe || 'Student') + '_Attempt' + (state.attempt || 1) + '.pdf');
  }

  window.ExamReport = { download: download };
})();
