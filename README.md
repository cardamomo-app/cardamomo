# Cardamomo

A quiet Markdown writing app built with browser-native JavaScript and CSS.

Serve `dist/` with any static web server. The app opens on a single blank card, saves the draft automatically in this browser, and downloads the document as Markdown.

- The blank-page button starts a new document; the folder opens a local Markdown file. Both can be undone.
- Imported heading levels map to columns in order (highest present first). Each heading starts a card, keeping its following body text. Skipped parent headings keep their column alignment; heading-like text inside code or quotations stays in its card.
- Above/below: add siblings; line buttons insert between siblings.
- Right: add a first child. Add more children using the vertical sibling controls. No left-side or horizontal-connector plus buttons.
- Drag a card's top handle within or between columns. Drop above/below another card to become its sibling, or beside a parent in the preceding column to attach as its child. The whole branch travels together; Escape cancels a drag.
- Click a card to edit Markdown; click outside or press Escape for its rendered preview.
- The moon/sun beside the zoom controls switches between light and dark mode. The preference is saved in this browser.
- Hover the outgoing connector to highlight it, then click to collapse a card's children. The small square expands the branch again. Nested folds and their saved state are preserved; hidden cards remain in Markdown exports and travel with their parent when dragged.
- Select text and press Cmd/Ctrl + B for bold or Cmd/Ctrl + I for italic. These shortcuts add Markdown markers; selecting the marked text and repeating the shortcut removes that formatting. Typing undo also undoes formatting.
- Enter creates a paragraph break; Shift + Enter inserts a Markdown hard line break. The browser handles paragraphs, line breaks, and typing undo directly in a native editable surface.
- Cmd/Ctrl + Enter splits at the cursor into a card below, with the remaining text and focus in the new card. Existing children stay with the upper card. Selected text stays in the lower card. Undo restores the split, including Cmd/Ctrl + Z immediately after splitting.
- Export traverses each root card, its descendants in order, then the next root.
- Removing a card preserves its children by moving them one column left. Undo restores changes.
- Alt + Up/Down reorders a focused card. Cmd/Ctrl + Z undoes structural changes outside text inputs.

Drafts are device- and browser-local. There is no account or cloud synchronization. Export Markdown for a portable copy.

Bundled assets: DM Mono regular and medium, each with normal and italic faces (SIL Open Font License), marked 15.0.12 (MIT), DOMPurify 3.2.6 (Apache-2.0 OR MPL-2.0).
