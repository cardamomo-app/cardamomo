# Cardamomo

A quiet Markdown writing app built with browser-native JavaScript and CSS.

Serve `dist/` with any static web server. The app opens on a single blank card, saves the draft automatically in this browser, and downloads the document as Markdown.

- Above/below: add siblings; line buttons insert between siblings.
- Right: add a first child. Add more children using the vertical sibling controls. No left-side or horizontal-connector plus buttons.
- Drag a card's top handle to move it within its column. Its children stay attached.
- Click a card to edit Markdown; click outside or press Escape for its rendered preview.
- Enter creates a paragraph break; Shift + Enter inserts a Markdown hard line break. The browser handles paragraphs, line breaks, and typing undo directly in a native editable surface.
- Export traverses each root card, its descendants in order, then the next root.
- Removing a card preserves its children by moving them one column left. Undo restores changes.
- Alt + Up/Down reorders a focused card. Cmd/Ctrl + Z undoes structural changes outside text inputs.

Drafts are device- and browser-local. There is no account or cloud synchronization. Export Markdown for a portable copy.

Bundled assets: Inconsolata (SIL Open Font License), marked 15.0.12 (MIT), DOMPurify 3.2.6 (Apache-2.0 OR MPL-2.0).
