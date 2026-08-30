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
      const clicked = lumine.textEditors.getTextEditorForElement(event?.target, {
        includeMini: false,
      });
      const editor = clicked ?? lumine.workspace.getActiveTextEditor();
      const bookmarks = editor && this.bookmarksByEditor.get(editor);
      if (bookmarks) bookmarks[method]();
    };

    this.disposables.add(
      lumine.commands.add("lumine-workspace", {
        "bookmarks:view-all": {
          description: "List the bookmarks of every open editor and jump to one.",
          didDispatch: async () => {
            if (this.bookmarksView == null) {
              this.bookmarksView = new BookmarksView(this.editorsBookmarks);
            }
            await this.bookmarksView.show();
          },
        },
        "bookmarks:toggle-bookmark": {
          description: "Add or remove a bookmark on the line holding the cursor.",
          didDispatch: forEditor("toggleBookmark"),
        },
        "bookmarks:jump-to-next-bookmark": {
          description: "Select the next bookmarked line, wrapping at the end.",
          didDispatch: forEditor("jumpToNextBookmark"),
        },
        "bookmarks:jump-to-previous-bookmark": {
          description: "Select the previous bookmarked line, wrapping at the start.",
          didDispatch: forEditor("jumpToPreviousBookmark"),
        },
        "bookmarks:select-to-next-bookmark": {
          description: "Extend the selection to the next bookmarked line.",
          didDispatch: forEditor("selectToNextBookmark"),
        },
        "bookmarks:select-to-previous-bookmark": {
          description: "Extend the selection to the previous bookmarked line.",
          didDispatch: forEditor("selectToPreviousBookmark"),
        },
        "bookmarks:clear-bookmarks": {
          description: "Remove every bookmark from this editor.",
          didDispatch: forEditor("clearBookmarks"),
        },
      }),
    );

    // Through `this.disposables` like everything else: left bare, the observer
    // outlived `deactivate()`, so disabling the package did not stop it and
    // every enable added another. An editor opened after one off/on cycle got
    // two instances, two persistent marker layers and six decoration layers,
    // and the provider's lookup found the stale one.
    this.disposables.add(
      lumine.workspace.observeTextEditors((textEditor) => {
        if (watchedEditors.has(textEditor)) {
          return;
        }

        // Consume the entry. The map is deserialization state for the editors
        // that existed when the window was serialized, and an id is handed out
        // again only once those editors are gone. Left in place, a later editor
        // landing on a matching id adopts it, and `getMarkerLayer` can then
        // return a different live layer in the same buffer — which this
        // instance would decorate as bookmarks and clear-bookmarks would empty.
        let bookmarks;
        const state = bookmarksByEditorId[textEditor.id];
        delete bookmarksByEditorId[textEditor.id];
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
      }),
    );
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
