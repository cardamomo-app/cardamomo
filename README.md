# Cardamomo

A quiet Markdown writing app built with browser-native JavaScript and CSS.

Serve `dist/` with any static web server. The app opens on a single blank card, saves the draft automatically in this browser, and downloads the document as Markdown.

- The blank-page button starts a new document; the folder opens a local Markdown file. Both can be undone.
- Imported heading levels map to columns in order (highest present first). Each heading starts a card, keeping its following body text. Skipped parent headings keep their column alignment; heading-like text inside code or quotations stays in its card.
- Above/below: add siblings; line buttons insert between siblings.
- Right: add a first child. Add more children using the vertical sibling controls. No left-side or horizontal-connector plus buttons.
- Ctrl + Shift + Right adds a first child when the right-hand plus is available. Ctrl + Shift + Up/Down adds a sibling above/below. Use these while editing or focusing a card; the new card opens for writing. Cmd + Arrow keeps normal text navigation, and Cmd + Shift + Arrow keeps normal text selection.
- Drag a card's top handle within or between columns. Drop above/below another card to become its sibling, or beside a parent in the preceding column to attach as its child. The whole branch travels together; Escape cancels a drag.
- Click a card to edit Markdown; click outside or press Escape for its rendered preview.
- Option/Alt + Control + Arrow opens another card for writing: Up/Down moves to the previous/next visible card in the same column, Left opens the parent, and Right opens the first child (expanding a folded branch). At an edge it stays on the current card. Writing is saved and the destination scrolls smoothly into view.
- Option/Alt + Control + Shift + Arrow merges cards. Up/Down requires neighboring visible cards in the same column with the same parent; the upper card stays, its text precedes the lower text, and both child trees attach to it in upper-then-lower order without changing columns. This places the two texts together before the combined children in Markdown export.
- Left merges the current child into its parent; Right merges the first child into the current parent. Expand a folded branch first. The parent stays and its text precedes the selected child's text. The selected child's children take its place among the parent's children; its whole descendant tree moves left by the parent–child column distance, keeping relative spacing. Other sibling branches stay unchanged. The merged card expands, while nested fold states remain intact. No children are deleted. Merging a later child left moves that child's text into the parent, before the remaining children in Markdown export.
- A refused merge leaves the draft and editing position unchanged and explains why. A successful merge opens for writing; immediate Cmd/Ctrl + Z or the Undo button restores the full previous tree, text, and folds. Holding the shortcut performs only one merge.
- The moon/sun beside the zoom controls switches between light and dark mode. The preference is saved in this browser.
- The focus button beside it requests true page fullscreen and hides the app header and statistics. Use the button or Escape to leave. Fullscreen requires a browser that allows the Fullscreen API and is never entered automatically.
- The canvas leaves enough room after the final column to center it. Opening a card to write centers that card horizontally, including after entering or leaving focus mode.
- Hover the outgoing connector to highlight it, then click to collapse a card's children. The small square expands the branch again. Nested folds and their saved state are preserved; hidden cards remain in Markdown exports and travel with their parent when dragged.
- Select text and press Cmd/Ctrl + B for bold or Cmd/Ctrl + I for italic. These shortcuts add Markdown markers; selecting the marked text and repeating the shortcut removes that formatting. Typing undo also undoes formatting.
- Enter creates a paragraph break; Shift + Enter inserts a Markdown hard line break. The browser handles paragraphs, line breaks, and typing undo directly in a native editable surface.
- Cmd/Ctrl + Enter splits at the cursor into a card below, with the remaining text and focus in the new card. Existing children stay with the upper card. Selected text stays in the lower card. Undo restores the split, including Cmd/Ctrl + Z immediately after splitting.
- Export traverses each root card, its descendants in order, then the next root.
- Removing a card preserves its children by moving them one column left. Undo restores changes.
- Alt + Up/Down reorders a focused card. Cmd/Ctrl + Z undoes structural changes outside text inputs.

Drafts are device- and browser-local. There is no account or cloud synchronization. Export Markdown for a portable copy.


Bundled assets: DM Mono regular and medium, each with normal and italic faces (SIL Open Font License), marked 15.0.12 (MIT), DOMPurify 3.2.6 (Apache-2.0 OR MPL-2.0).
