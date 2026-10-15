const path = require("path");
const fs = require("fs");
const lastCoveredRow = require("./bookmark-range");

// `basename:start` for a bookmark on one row, `basename:start-end` for one
// spanning several. One-based, because that is how the editor numbers lines.
//
// Both the row the picker renders and the text it filters on come from here:
// the filter used to carry the zero-based row while the row displayed the
// one-based one, so typing the line number the list showed matched nothing.
const locationFor = ({ editor, marker }) => {
  const startRow = marker.getStartBufferPosition().row;
  const endRow = lastCoveredRow(marker.getBufferRange());
  const name = editor.getPath() ? path.basename(editor.getPath()) : "untitled";
  return startRow === endRow ? `${name}:${startRow + 1}` : `${name}:${startRow + 1}-${endRow + 1}`;
};

module.exports = class BookmarksView {
  constructor(editorsBookmarks, window = lumine.workspace.getMainWindow()) {
    this.destroyed = false;
    this.window = window;
    this.editorsBookmarks = editorsBookmarks;
    this.selectListHost = lumine.workspace.addSelectList(
      {
        emptyMessage: "No bookmarks found",
        items: [],
        getItemId: ({ editor, marker }) => JSON.stringify([editor.id, marker.id]),
        search: { getFilterText: (bookmark) => bookmark.filterText },
        commands: {
          "bookmarks:open-bookmark": {
            description: "Open the editor and range of the selected bookmark.",
            didDispatch: (event) => this.openBookmark(event.detail.item),
          },
          "bookmarks:open-selected-with": {
            description: "Choose an opener for the bookmarked file.",
            didDispatch: ({ detail }) => this.performFileAction(detail.item, "with", detail.signal),
          },
          "bookmarks:open-selected-external": {
            description: "Open the bookmarked file in its external application.",
            didDispatch: ({ detail }) =>
              this.performFileAction(detail.item, "external", detail.signal),
          },
          "bookmarks:show-selected-in-folder": {
            description: "Reveal the bookmarked file in the system file manager.",
            didDispatch: ({ detail }) => this.performFileAction(detail.item, "show", detail.signal),
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
          ...[
            "bookmarks:open-selected-with",
            "bookmarks:open-selected-external",
            "bookmarks:show-selected-in-folder",
          ].map((command) => ({
            command,
            context: "item",
            group: "File",
            disposition: "close",
            when: ({ item }) => Boolean(this.fileTarget(item)),
          })),
        ],
        renderItem: (bookmark) => {
          const { editor, marker } = bookmark;
          const lineText = editor.lineTextForBufferRow(marker.getStartBufferPosition().row);
          return {
            className: "bookmark",
            primary: locationFor(bookmark),
            secondary: lineText ? lineText.trim() : undefined,
            didRender: (element) => {
              element.querySelector(".secondary-line")?.classList.add("line-text");
            },
          };
        },
      },
      { className: "bookmarks-view", crumb: "Bookmarks", window },
    );
    this.selectList = this.selectListHost.getModel();
  }

  fileTarget(bookmark) {
    if (!bookmark || !bookmark.editor.isAlive() || bookmark.marker.isDestroyed()) return null;
    const filePath = bookmark.editor.getPath();
    if (!filePath || !path.isAbsolute(filePath)) return null;
    try {
      if (!fs.statSync(filePath).isFile()) return null;
    } catch {
      return null;
    }
    const { row, column } = bookmark.marker.getStartBufferPosition();
    return { path: filePath, initialLine: row, initialColumn: column, pane: this.pane };
  }

  async performFileAction(bookmark, mode, signal) {
    const target = this.fileTarget(bookmark);
    if (!target || this.destroyed || this.window.isDestroyed() || signal?.aborted) return;
    if (mode === "with") {
      const opening = lumine.commands.dispatch(this.window.getElement(), "launcher:open", target);
      if (!opening) throw new Error("The Launcher package is not available.");
      return opening;
    }
    const { path: filePath, ...position } = target;
    return lumine.workspace.open(filePath, {
      ...position,
      signal,
      opener: mode === "external" ? "open-external" : "open-external:show",
    });
  }

  async openBookmark({ editor, marker }) {
    // The list is built when it opens, so by the time a row is confirmed
    // its editor may have been closed and its bookmark destroyed.
    if (!editor.isAlive() || marker.isDestroyed()) return;

    // Undefined for an editor no container holds any more.
    const pane = lumine.workspace.paneForItem(editor);
    if (!pane) return;
    const window = pane.getContainer().getWindow();
    const current = () =>
      !this.destroyed &&
      editor.isAlive() &&
      !marker.isDestroyed() &&
      !window.isDestroyed() &&
      lumine.workspace.paneForItem(editor) === pane &&
      pane.getContainer()?.getWindow() === window;

    // Before the selection, so the autoscroll below lands on an editor
    // that is on screen rather than on a hidden one.
    try {
      const opened = await lumine.workspace.open(editor, { searchAllPanes: true });
      if (!opened || !current()) return;
      await window.show();
      if (!current()) return;
      await window.focus();
      if (!current()) return;
      editor.setSelectedBufferRange(marker.getBufferRange(), { autoscroll: true });
    } catch (error) {
      if (current()) throw error;
    }
  }

  destroy() {
    this.destroyed = true;
    this.selectListHost.destroy();
  }

  async show() {
    if (this.destroyed) return;
    this.pane = this.window.getEditorContainer().getActivePane();
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
    if (this.destroyed) return;
    this.selectListHost.show();
  }

  hide() {
    this.selectListHost.hide();
  }
};
