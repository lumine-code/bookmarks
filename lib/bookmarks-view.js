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
      getItemId: ({ editor, marker }) => JSON.stringify([editor.id, marker.id]),
      search: { getFilterText: (bookmark) => bookmark.filterText },
      commands: {
        "bookmarks:open-bookmark": {
          description: "Open the editor and range of the selected bookmark.",
          didDispatch: (event) => this.openBookmark(event.detail.item),
        },
      },
      actions: [
        {
          command: "bookmarks:open-bookmark",
          context: "item",
          primary: true,
          disposition: "close",
          dispatch: "local",
        },
      ],
      renderItem: (bookmark) => {
        const { editor, marker } = bookmark;
        const lineText = editor.lineTextForBufferRow(marker.getStartBufferPosition().row);
        return {
          className: "bookmark",
          primary: locationFor(bookmark),
          secondary: lineText ? lineText.trim() : undefined,
          didRender: (element) =>
            element.querySelector(".secondary-line")?.classList.add("line-text"),
        };
      },
    });
  }

  async openBookmark({ editor, marker }) {
    // The list is built when it opens, so by the time a row is confirmed
    // its editor may have been closed and its bookmark destroyed.
    if (!editor.isAlive() || marker.isDestroyed()) return;

    // Undefined for an editor no container holds any more.
    const pane = lumine.workspace.paneForItem(editor);
    if (!pane) return;

    // Before the selection, so the autoscroll below lands on an editor
    // that is on screen rather than on a hidden one.
    const opened = await lumine.workspace.open(editor, { searchAllPanes: true });
    if (!opened || !editor.isAlive() || marker.isDestroyed()) return;
    editor.setSelectedBufferRange(marker.getBufferRange(), { autoscroll: true });
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

    await this.selectList.setItems(bookmarks);
    this.selectList.show();
  }

  hide() {
    this.selectList.hide();
  }
};
