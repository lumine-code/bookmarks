const path = require("path");

// `basename:start` for a bookmark on one row, `basename:start-end` for one
// spanning several. One-based, because that is how the editor numbers lines.
//
// Both the row the picker renders and the text it filters on come from here:
// the filter used to carry the zero-based row while the row displayed the
// one-based one, so typing the line number the list showed matched nothing.
const locationFor = ({ editor, marker }) => {
  const startRow = marker.getStartBufferPosition().row;
  const endRow = marker.getEndBufferPosition().row;
  const name = editor.getPath() ? path.basename(editor.getPath()) : "untitled";
  return startRow === endRow ? `${name}:${startRow + 1}` : `${name}:${startRow + 1}-${endRow + 1}`;
};

module.exports = class BookmarksView {
  constructor(editorsBookmarks) {
    this.editorsBookmarks = editorsBookmarks;
    this.selectList = lumine.workspace.buildSelectList({
      className: "bookmarks-view",
      crumb: "Bookmarks",
      emptyMessage: "No bookmarks found",
      items: [],
      filterKeyForItem: (bookmark) => bookmark.filterText,
      didConfirmSelection: async ({ editor, marker }) => {
        this.hide();

        // The list is built when it opens, so by the time a row is confirmed
        // its editor may have been closed and its bookmark destroyed.
        if (!editor.isAlive() || marker.isDestroyed()) return;

        // Undefined for an editor no container holds any more.
        const pane = lumine.workspace.paneForItem(editor);
        if (!pane) return;

        // Before the selection, so the autoscroll below lands on an editor
        // that is on screen rather than on a hidden one. Core also focuses the
        // native window when that editor belongs to a detached pane.
        const opened = await lumine.workspace.open(editor, { searchAllPanes: true });
        if (!opened || !editor.isAlive() || marker.isDestroyed()) return;
        editor.setSelectedBufferRange(marker.getBufferRange(), { autoscroll: true });
      },
      didCancelSelection: () => {
        this.hide();
      },
      elementForItem: (bookmark) => {
        const { editor, marker } = bookmark;
        const lineText = editor.lineTextForBufferRow(marker.getStartBufferPosition().row);

        const li = document.createElement("li");
        li.classList.add("bookmark");
        const primaryLine = document.createElement("div");
        primaryLine.classList.add("primary-line");
        primaryLine.textContent = locationFor(bookmark);
        li.appendChild(primaryLine);
        if (lineText) {
          const secondaryLine = document.createElement("div");
          secondaryLine.classList.add("secondary-line", "line-text");
          secondaryLine.textContent = lineText.trim();
          li.appendChild(secondaryLine);
          li.classList.add("two-lines");
        }
        return li;
      },
    });
  }

  destroy() {
    this.selectList.destroy();
  }

  async show() {
    const bookmarks = [];
    for (const { editor, markerLayer } of this.editorsBookmarks) {
      if (!editor.isAlive()) continue;

      for (const marker of markerLayer.getMarkers()) {
        const bookmark = { marker, editor };
        let filterText = locationFor(bookmark);

        // The full path as well, so a query can narrow by directory even
        // though the row shows only the basename.
        if (editor.getPath()) {
          filterText += ` ${editor.getPath()}`;
        }

        const bookmarkedLineText = editor.lineTextForBufferRow(marker.getStartBufferPosition().row);
        if (bookmarkedLineText) {
          filterText += ` ${bookmarkedLineText.trim()}`;
        }

        bookmark.filterText = filterText;
        bookmarks.push(bookmark);
      }
    }

    await this.selectList.update({ items: bookmarks });
    this.selectList.show();
  }

  hide() {
    this.selectList.hide();
  }
};
