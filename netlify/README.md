# Netlify upload folder

Each sub-folder here holds one file, `index.html`: a complete, self-contained student website (styles, code and the PDF library are all built in). Deploy each one as its **own** Netlify site:

1. Go to [app.netlify.com/drop](https://app.netlify.com/drop) (or **Sites > Add new site > Deploy manually**).
2. Drag **one** sub-folder (not this whole `netlify` folder) onto the page.
3. Netlify gives you a link to share with students. Repeat for the other folders.

| Folder | What it is | Certificate or report |
|---|---|---|
| `midterm-exam/` | ACC 211 Midterm (journal, adjusting and closing entries) | PDF score report |
| `gl-practice/` | Bright Mart General Ledger: untimed practice, check and retry | Certificate when all 15 entries are correct |
| `gl-workshop/` | Merchandising General Ledger Workshop: scored, with hints | Certificate at 70% or higher |

To update a site later, open it in Netlify, go to **Deploys**, and drag the updated folder onto the deploy area. The link stays the same.

These files are generated. To change a site, edit its source in `src/<site>/`, then run `node tools/build-netlify.js`.

Do **not** upload the `instructor/` folder (it contains the answer key). The Part 2 exam sites (`part2-site/`, `part2-exam-site/`) are still at the top of the repository.
