/* ACC 211 Part 3 practice: PDF report (jsPDF + AutoTable, bundled in /vendor). */
(function () {
  'use strict';

  const E = window.Part3Engine;
  const BRAND = [31, 78, 121], INK = [27, 37, 51], MUTED = [107, 119, 137];
  const OK = [44, 122, 75], BAD = [180, 35, 24], HALF = [154, 103, 0];

  // Standard PDF fonts only cover Latin-1, so swap typographic characters for plain ones.
  function t(s) {
    return String(s == null ? '' : s)
      .replace(/[‘’]/g, "'").replace(/[“”]/g, '"')
      .replace(/[–—−]/g, '-').replace(/→/g, '->').replace(/[^\x00-\xFF]/g, '?');
  }
  const pts = n => (Math.round(n * 100) / 100).toFixed(2);
  const markText = st => st === 'ok' ? 'Right' : st === 'half' ? 'Half' : 'Wrong';
  const markColor = st => st === 'ok' ? OK : st === 'half' ? HALF : BAD;

  function download(state, now, firstTotal, check) {
    const doc = new window.jspdf.jsPDF({ unit: 'pt', format: 'letter' });
    const W = doc.internal.pageSize.getWidth(), M = 48;
    const B = E.BIZ;

    doc.setFillColor.apply(doc, BRAND);
    doc.rect(0, 0, W, 70, 'F');
    doc.setTextColor(255, 255, 255).setFont('helvetica', 'bold').setFontSize(18);
    doc.text('ACC 211 Practice: Merchandising Statements', M, 34);
    doc.setFont('helvetica', 'normal').setFontSize(10);
    doc.text(t(B.name) + ' (perpetual inventory)  |  Score Report', M, 52);

    doc.setTextColor.apply(doc, INK).setFont('helvetica', 'bold').setFontSize(22);
    doc.text(t(state.name), M, 98);
    const checks = E.STAGES.map(s => s.short + ': ' + (state.checks[s.id] || 0)).join(', ');
    const figs = E.STAGES.filter(s => state.figs[s.id]).map(s => s.short).join(', ') || 'None';
    doc.autoTable({
      startY: 112, margin: { left: M, right: M }, theme: 'plain',
      body: [['Attempt', String(state.attempt)], ['Report ID', state.id], ['Check code', check],
        ['Checks used', checks], ['Check figures viewed', figs],
        ['Started', new Date(state.startedAt).toLocaleString()],
        ['Finished', state.finishedAt ? new Date(state.finishedAt).toLocaleString() : 'Not finished']].map(r => [t(r[0]), t(r[1])]),
      styles: { fontSize: 10, cellPadding: 2, textColor: INK }, columnStyles: { 0: { cellWidth: 120, textColor: MUTED } }
    });

    doc.autoTable({
      startY: doc.lastAutoTable.finalY + 14, margin: { left: M, right: M }, theme: 'grid',
      head: [['Stage', 'First try (counts)', 'After corrections', 'Possible']],
      body: E.STAGES.map((s, i) => [t((i + 1) + '. ' + s.title), pts(state.first[s.id] || 0), pts(now.stages[i].score), String(s.points)]),
      foot: [['Total', pts(firstTotal), pts(now.total), String(E.POSSIBLE)]],
      headStyles: { fillColor: BRAND }, footStyles: { fillColor: [231, 239, 248], textColor: INK, fontStyle: 'bold' },
      styles: { fontSize: 10.5, textColor: INK },
      didParseCell: d => { if (d.column.index > 0) d.cell.styles.halign = 'right'; }
    });
    const y = doc.lastAutoTable.finalY + 16;
    doc.setFont('helvetica', 'normal').setFontSize(9).setTextColor.apply(doc, MUTED);
    doc.text(doc.splitTextToSize('Upload this PDF to Canvas. The first-try score is the score from the first Check of each stage; ' +
      'later corrections are shown for your learning but do not change it. If you make more than one attempt, your highest first-try score counts. ' +
      'The pages that follow show your work as it stands now, marked line by line.', W - 2 * M), M, y);

    // Classification
    const gc = E.gradeClassify(state.ans.classify);
    newPage(doc, 'Stage 1: Classify the Accounts', gc, now.stages[0].score, E.STAGES[0].points, M);
    doc.autoTable({
      startY: M + 24, margin: { left: M, right: M }, theme: 'grid',
      head: [['Account', 'Your category', 'Result']],
      body: E.ACCOUNTS.map(a => {
        const pick = E.CAT[state.ans.classify[a.no]];
        return [t(a.no + '  ' + a.name), t(pick ? pick.stmt + ': ' + pick.label : '(none)'), markText(gc.items[a.no].st)];
      }),
      headStyles: { fillColor: [244, 246, 249], textColor: INK }, styles: { fontSize: 9, textColor: INK, cellPadding: 3 },
      columnStyles: { 2: { cellWidth: 50 } },
      didParseCell: d => { if (d.section === 'body' && d.column.index === 2) d.cell.styles.textColor = markColor(gc.items[E.ACCOUNTS[d.row.index].no].st); }
    });

    // Statements
    ['is', 'soe', 'bs'].forEach((kind, k) => {
      const S = E.STATEMENTS[kind], A = state.ans[kind];
      const g = E.gradeStatement(kind, state.ans);
      newPage(doc, 'Stage ' + (k + 2) + ': ' + E.STAGES[k + 1].title, g, now.stages[k + 1].score, E.STAGES[k + 1].points, M);
      const body = [], marks = [];
      body.push([{ content: t(B.name + '\n' + (A.head.title || '(no title)') + '\n' + (A.head.date || '(no date line)')), colSpan: 3, styles: { halign: 'center', fontStyle: 'bold' } },
        t(markText(g.head.title.st) + ' / ' + markText(g.head.date.st))]);
      marks.push(g.head.title.st === 'ok' && g.head.date.st === 'ok' ? 'ok' : (g.head.title.st === 'ok' || g.head.date.st === 'ok') ? 'half' : 'bad');
      S.lines.forEach(L => {
        const pad = '   '.repeat(L.ind);
        if (L.t === 'hdr') { body.push([{ content: t(pad + L.label), colSpan: 4, styles: { fontStyle: 'bold' } }]); marks.push(null); return; }
        const acct = L.t === 'acct' ? (E.ACCT[Number(A.acct[L.id])] ? E.ACCT[Number(A.acct[L.id])].name : '(no account chosen)') : L.label;
        const amt = A.amt[L.id] || '';
        const m = g.lines[L.id];
        body.push([t(pad + (L.pre ? L.pre + ' ' : '') + acct), L.col === 1 ? t(amt) : '', L.col === 2 ? t(amt) : '', markText(m.st)]);
        marks.push(m.st);
      });
      doc.autoTable({
        startY: M + 24, margin: { left: M, right: M }, theme: 'plain',
        head: [['Line', 'Detail', 'Total', 'Result']],
        body,
        headStyles: { fillColor: [244, 246, 249], textColor: INK }, styles: { fontSize: 9, textColor: INK, cellPadding: 2.5 },
        columnStyles: { 1: { cellWidth: 80, halign: 'right' }, 2: { cellWidth: 80, halign: 'right' }, 3: { cellWidth: 50 } },
        didParseCell: d => {
          if (d.section !== 'body') return;
          const st = marks[d.row.index];
          if (d.column.index === 3 && st) d.cell.styles.textColor = markColor(st);
        }
      });
    });

    const pages = doc.getNumberOfPages(), H = doc.internal.pageSize.getHeight();
    for (let p = 1; p <= pages; p++) {
      doc.setPage(p);
      doc.setFont('helvetica', 'normal').setFontSize(8).setTextColor.apply(doc, MUTED);
      doc.text(t(state.name) + '  |  Merchandising Statements Practice  |  Attempt ' + state.attempt + '  |  Report ' + state.id + '  |  Check ' + check, M, H - 24);
      doc.text('Page ' + p + ' of ' + pages, W - M, H - 24, { align: 'right' });
    }
    const safe = t(state.name).replace(/[^A-Za-z0-9]+/g, '_').replace(/^_|_$/g, '');
    doc.save('ACC211_Merch_Statements_' + (safe || 'Student') + '_Attempt' + state.attempt + '.pdf');
  }

  function newPage(doc, title, g, score, possible, M) {
    doc.addPage();
    doc.setTextColor.apply(doc, BRAND).setFont('helvetica', 'bold').setFontSize(15);
    doc.text(t(title), M, M);
    doc.setTextColor.apply(doc, MUTED).setFont('helvetica', 'normal').setFontSize(9.5);
    doc.text('Current work: ' + pts(score) + ' / ' + possible + '  (' + (Math.round(g.units * 10) / 10) + ' of ' + g.total + ' items right)', M, M + 14);
  }

  window.Part3Report = { download };
})();
