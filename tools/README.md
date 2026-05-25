# tools/

## gen_projects.py

Regenerates every `project-{slug}.html` and the `projects.html` cards grid from
`assets/BA Holding.xlsx`.

Run from the repo root:

```
pip install openpyxl
python tools/gen_projects.py
```

What it does:

1. Reads each project sheet of `assets/BA Holding.xlsx` (sheets `1. NMZ …` …
   `13. Tai Chang Group`).
2. Merges row data with per-project metadata baked into `META` at the top of the
   script (slug, category, logo, image variant, hero title split, related-section
   heading, optional site URL).
3. Renders 13 files at the repo root: `project-nmz.html`, `project-tmz.html`,
   `project-jmz.html`, `project-ba-chirchiq-metall.html`, `project-emirate-steel.html`,
   `project-fuxin.html`, `project-china-house.html`, `project-tpp.html`,
   `project-ba-texnopark.html`, `project-awiner-agro.html`,
   `project-sirdarya-metal-construction.html`, `project-shengli-steel.html`,
   `project-tai-chang-group.html`.
4. Updates the `<div class="proj-grid" id="projGrid">…</div>` block in
   `projects.html` in place — leaves everything else (header, hero, flagship,
   CTA, footer, scripts) untouched. Also rewrites the "Всего N предприятий"
   counter.

### Adding a new project

1. Add a new sheet to `assets/BA Holding.xlsx` with the same column layout.
2. Add a matching key to the `META` dict in `gen_projects.py` (slug, category,
   logo, image variant, hero text).
3. Re-run `python tools/gen_projects.py`.

### template-project-item.html

Frozen NMZ-style version of the project page. Used as the source HTML that the
generator finds-and-replaces project-specific text in. Edit this file when you
want a layout / footer / shared-section change to apply to **all** project
pages — then re-run the generator.

If you edit a single `project-*.html` by hand, your changes will be overwritten
on the next regeneration. Make layout edits in `tools/template-project-item.html`
and copy-only edits in `assets/BA Holding.xlsx`.
