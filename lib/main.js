const { CompositeDisposable } = require("lumine");

const Bookmarks = require("./bookmarks");
const BookmarksView = require("./bookmarks-view");
const BookmarksProvider = require("./bookmarks-provider");

module.exports = {
  activate(bookmarksByEditorId) {
    this.bookmarksView = null;
    this.editorsBookmarks = [];
    this.bookmarksByEditor = new WeakMap();
    this.disposables = new CompositeDisposable();
    const watchedEditors = new WeakSet();

    // One registration on the workspace rather than one per editor element.
    // Edit > Bookmark dispatches at whatever holds focus, so the per-editor
    // registrations left every item there dead unless an editor was focused —
    // and a mini editor never got one at all, which is why Toggle bookmark in
    // the find field's context menu did nothing.
    // The editor the dispatch came from — a keystroke or a right-click in a
    // background pane means that editor, not the active one — falling back to
    // the active editor for the menu and the command palette.
    const forEditor = (method) => (event) => {
      const clicked = event?.target?.closest?.("lumine-text-editor:not([mini])")?.getModel?.();
      const editor = clicked ?? lumine.workspace.getActiveTextEditor();
      const bookmarks = editor && this.bookmarksByEditor.get(editor);
      if (bookmarks) bookmarks[method]();
    };

    this.disposables.add(
      lumine.commands.add("lumine-workspace", {
        "bookmarks:view-all": async () => {
          if (this.bookmarksView == null) {
            this.bookmarksView = new BookmarksView(this.editorsBookmarks);
          }
          await this.bookmarksView.show();
        },
        "bookmarks:toggle-bookmark": forEditor("toggleBookmark"),
        "bookmarks:jump-to-next-bookmark": forEditor("jumpToNextBookmark"),
        "bookmarks:jump-to-previous-bookmark": forEditor("jumpToPreviousBookmark"),
        "bookmarks:select-to-next-bookmark": forEditor("selectToNextBookmark"),
        "bookmarks:select-to-previous-bookmark": forEditor("selectToPreviousBookmark"),
        "bookmarks:clear-bookmarks": forEditor("clearBookmarks"),
      }),
    );

    lumine.workspace.observeTextEditors((textEditor) => {
      if (watchedEditors.has(textEditor)) {
        return;
      }

      let bookmarks;
      let state = bookmarksByEditorId[textEditor.id];
      if (state) {
        bookmarks = Bookmarks.deserialize(textEditor, state);
      } else {
        bookmarks = new Bookmarks(textEditor);
      }

      this.editorsBookmarks.push(bookmarks);
      this.bookmarksByEditor.set(textEditor, bookmarks);
      watchedEditors.add(textEditor);
      this.disposables.add(
        textEditor.onDidDestroy(() => {
          const index = this.editorsBookmarks.indexOf(bookmarks);
          if (index !== -1) {
            this.editorsBookmarks.splice(index, 1);
          }

          bookmarks.destroy();
          this.bookmarksByEditor.delete(textEditor);
          watchedEditors.delete(textEditor);
        }),
      );
    });
  },

  deactivate() {
    if (this.bookmarksView != null) {
      this.bookmarksView.destroy();
      this.bookmarksView = null;
    }

    for (let bookmarks of this.editorsBookmarks) {
      bookmarks.deactivate();
    }
    this.disposables.dispose();
  },

  serialize() {
    const bookmarksByEditorId = {};
    for (let bookmarks of this.editorsBookmarks) {
      bookmarksByEditorId[bookmarks.editor.id] = bookmarks.serialize();
    }
    return bookmarksByEditorId;
  },

  provideBookmarks() {
    this.bookmarksProvider ??= new BookmarksProvider(this);
    return this.bookmarksProvider;
  },
};
