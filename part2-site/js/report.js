/* ACC 211 Midterm Part 2: PDF score report (jsPDF + AutoTable, bundled in /vendor). */
(function () {
  'use strict';

  const E = window.Part2Engine;
  const BRAND = [31, 78, 121], INK = [27, 37, 51], MUTED = [107, 119, 137];

  // Standard PDF fonts only cover Latin-1, so swap typographic characters for plain ones.
  function t(s) {
    return String(s == null ? '' : s)
      .replace(/[‘’]/g, "'").replace(/[“”]/g, '"')
      .replace(/[–—−]/g, '-').replace(/→/g, '->').replace(/÷/g, '/').replace(/×/g, 'x')
      .replace(/[^\x00-\xFF]/g, '?');
  }

  function download(exam, state, result, check) {
    const doc = new window.jspdf.jsPDF({ unit: 'pt', format: 'letter' });
    const W = doc.internal.pageSize.getWidth(), M = 48;
    const D = exam.data;

    doc.setFillColor.apply(doc, BRAND);
    doc.rect(0, 0, W, 70, 'F');
    doc.setTextColor(255, 255, 255).setFont('helvetica', 'bold').setFontSize(18);
    doc.text('ACC 211 Midterm Part 2: Score Report', M, 34);
    doc.setFont('helvetica', 'normal').setFontSize(10);
    doc.text('Financial Statement Analysis: Income Statement and Balance Sheet', M, 52);

    doc.setTextColor.apply(doc, INK).setFont('helvetica', 'bold').setFontSize(22);
    doc.text(t(state.name), M, 98);
    doc.autoTable({
      startY: 112, margin: { left: M, right: M }, theme: 'plain',
      body: [['Attempt', String(state.attempt || 1)], ['Version code', state.code], ['Check code', check],
        ['Business', D.biz.name + ' (' + D.biz.owner + ', owner)'],
        ['Hints used', String(Object.keys(state.hints || {}).length)],
        ['Started', new Date(state.startedAt).toLocaleString()], ['Submitted', new Date(state.finishedAt).toLocaleString()]].map(r => [t(r[0]), t(r[1])]),
      styles: { fontSize: 10, cellPadding: 2, textColor: INK }, columnStyles: { 0: { cellWidth: 90, textColor: MUTED } }
    });

    let num = { A: 0, B: 0 };
    const stageLabel = s => { num[s.section] += 1; return s.section + num[s.section] + '. ' + s.title; };
    const labels = exam.stages.map(stageLabel);
    doc.autoTable({
      startY: doc.lastAutoTable.finalY + 14, margin: { left: M, right: M }, theme: 'grid',
      head: [['Stage', 'Score', 'Possible']],
      body: result.stages.map((s, i) => [t(labels[i]), s.score.toFixed(2), s.possible])
        .concat([[{ content: 'Section A: Income statement', styles: { fontStyle: 'bold' } }, result.sectionA.score.toFixed(2), result.sectionA.possible],
          [{ content: 'Section B: Balance sheet', styles: { fontStyle: 'bold' } }, result.sectionB.score.toFixed(2), result.sectionB.possible]]),
      foot: [['Total', result.total.toFixed(2), result.possible]],
      headStyles: { fillColor: BRAND }, footStyles: { fillColor: [231, 239, 248], textColor: INK, fontStyle: 'bold' },
      styles: { fontSize: 10.5, textColor: INK },
      columnStyles: { 1: { halign: 'right', cellWidth: 70 }, 2: { halign: 'right', cellWidth: 70 } },
      didParseCell: d => { if (d.column.index > 0) d.cell.styles.halign = 'right'; }
    });
    let y = doc.lastAutoTable.finalY + 16;
    doc.setFont('helvetica', 'normal').setFontSize(9).setTextColor.apply(doc, MUTED);
    doc.text(doc.splitTextToSize('Upload this PDF to the Canvas assignment. If you take Part 2 more than once, your highest attempt counts. ' +
      'Each question is worth 2.5 points; build-the-total boards earn partial credit for each item placed correctly. Written answers are not scored.', W - 2 * M), M, y);

    // Written answers
    const writes = [];
    exam.stages.forEach(st => st.questions.forEach(q => { if (q.write) writes.push([q.write.label, state.writes[q.write.id] || '(no answer)']); }));
    if (writes.length) {
      doc.addPage();
      doc.setTextColor.apply(doc, BRAND).setFont('helvetica', 'bold').setFontSize(15);
      doc.text('Written Answers (not scored)', M, M);
      doc.autoTable({ startY: M + 12, margin: { left: M, right: M }, theme: 'grid',
        body: writes.map(w => [t(w[0]), t(w[1])]),
        styles: { fontSize: 10, textColor: INK, cellPadding: 6 }, columnStyles: { 0: { cellWidth: 140, fontStyle: 'bold' } } });
    }

    // Detailed responses by stage
    exam.stages.forEach((st, si) => {
      doc.addPage();
      doc.setTextColor.apply(doc, BRAND).setFont('helvetica', 'bold').setFontSize(15);
      doc.text(t(labels[si]), M, M);
      doc.setTextColor.apply(doc, MUTED).setFont('helvetica', 'normal').setFontSize(9.5);
      doc.text('Score: ' + result.stages[si].score.toFixed(2) + ' / ' + result.stages[si].possible, M, M + 14);
      doc.autoTable({
        startY: M + 24, margin: { left: M, right: M }, theme: 'grid',
        head: [['#', 'Question', 'Your answer', 'Points']],
        body: st.questions.map((q, i) => [String(i + 1), t(q.prompt) + (state.hints[q.id] ? '\n(hint used)' : ''),
          t(E.describeAnswer(exam, q, state.answers[q.id])), result.stages[si].items[i].earned.toFixed(2) + ' / ' + q.points]),
        headStyles: { fillColor: [244, 246, 249], textColor: INK },
        styles: { fontSize: 9, textColor: INK, cellPadding: 4, valign: 'top' },
        columnStyles: { 0: { cellWidth: 20 }, 1: { cellWidth: 230 }, 3: { cellWidth: 58, halign: 'right' } },
        rowPageBreak: 'avoid'
      });
    });

    const pages = doc.getNumberOfPages(), H = doc.internal.pageSize.getHeight();
    for (let p = 1; p <= pages; p++) {
      doc.setPage(p);
      doc.setFont('helvetica', 'normal').setFontSize(8).setTextColor.apply(doc, MUTED);
      doc.text(t(state.name) + '  |  Part 2  |  Attempt ' + (state.attempt || 1) + '  |  Version ' + state.code + '  |  Check ' + check, M, H - 24);
      doc.text('Page ' + p + ' of ' + pages, W - M, H - 24, { align: 'right' });
    }
    const safe = t(state.name).replace(/[^A-Za-z0-9]+/g, '_').replace(/^_|_$/g, '');
    doc.save('ACC211_Midterm_Part2_' + (safe || 'Student') + '_Attempt' + (state.attempt || 1) + '.pdf');
  }

  window.Part2Report = { download: download };
})();
