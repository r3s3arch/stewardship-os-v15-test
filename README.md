# The Living Word — V15 standalone reader preview

**Do not deploy over the existing Stewardship OS app.** This is a standalone development preview built from the user-supplied `engwebu_usfm.zip` archive.

## Running locally

From this folder, run `python -m http.server 8000` and open `http://localhost:8000`. Opening `index.html` as a `file://` URL may block loading local JSON. To test true offline behavior, deploy to a suitable static host with an appropriate cache/service worker (not yet included).

## Included

- 81 source Bible book files, grouped as 39 Old Testament, 15 Deuterocanonical, 27 New Testament.
- 1,402 chapter records and 38,034 nonempty verse entries extracted for the preview.
- Original USFM archive included **unchanged**, with SHA-256 recorded in manifest.
- In-place Study panel for verses, note creation/deletion, highlight toggle, and personal connection entry.
- Local browser storage for preview annotations.
- Source footnotes extracted where recognizable.

## Not yet production-ready

- The USFM-to-readable-text converter is a **preliminary extractor**, not a fully audited USFM parser. It may omit or flatten inline formatting, verse bridges, poetry, cross-reference markers, and other structural content. Original source is retained for reconciliation.
- 24 source verse markers yielded no main verse text (e.g. Sirach and several NT textual variants); these are **flagged**, not silently filled with another translation. See `manifest.json`.
- Some footnote structure may be simplified; no guarantee of complete fidelity until automated source-to-rendered-text checks and spot reviews pass.
- This preview does **not** yet include offline service worker caching, Bible-wide search, curated cross-reference dataset, My Walk integration, note editing, full backup/restore, reading history, bookmarks, mobile browser automation, or security certification.
- Reader state is browser-local; do not use it for important study records yet.

## Next engineering milestone

Validate source parsing and verse coverage, add reliable offline caching and index/search, implement persistent reference-based notes and cross-reference preview, then integrate with V14 only after regression tests.
