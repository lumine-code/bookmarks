describe("Bookmarks navigation", () => {
  let workspaceElement, editorElement, editor;

  beforeEach(async () => {
    spyOn(window, "setImmediate").and.callFake((fn) => fn());
    workspaceElement = lumine.views.getView(lumine.workspace);

    await lumine.workspace.open("sample.js");

    await lumine.packages.activatePackage("bookmarks");

    jasmine.attachToDOM(workspaceElement);
    editor = lumine.workspace.getActiveTextEditor();
    editorElement = lumine.views.getView(editor);
  });

  describe("jumping between bookmarks", () => {
    it("doesn't die when no bookmarks", () => {
      editor.setCursorBufferPosition([5, 10]);

      lumine.commands.dispatch(editorElement, "bookmarks:jump-to-next-bookmark");
      expect(editor.getLastCursor().getBufferPosition()).toEqual([5, 10]);

      lumine.commands.dispatch(editorElement, "bookmarks:jump-to-previous-bookmark");
      expect(editor.getLastCursor().getBufferPosition()).toEqual([5, 10]);
    });

    describe("with one bookmark", () => {
      beforeEach(() => {
        editor.setCursorBufferPosition([2, 0]);
        lumine.commands.dispatch(editorElement, "bookmarks:toggle-bookmark");
      });

      it("jump-to-next-bookmark jumps to the right place", () => {
        editor.setCursorBufferPosition([0, 0]);

        lumine.commands.dispatch(editorElement, "bookmarks:jump-to-next-bookmark");
        expect(editor.getLastCursor().getBufferPosition()).toEqual([2, 0]);

        lumine.commands.dispatch(editorElement, "bookmarks:jump-to-next-bookmark");
        expect(editor.getLastCursor().getBufferPosition()).toEqual([2, 0]);

        editor.setCursorBufferPosition([5, 0]);

        lumine.commands.dispatch(editorElement, "bookmarks:jump-to-next-bookmark");
        expect(editor.getLastCursor().getBufferPosition()).toEqual([2, 0]);
      });

      it("jump-to-previous-bookmark jumps to the right place", () => {
        editor.setCursorBufferPosition([0, 0]);

        lumine.commands.dispatch(editorElement, "bookmarks:jump-to-previous-bookmark");
        expect(editor.getLastCursor().getBufferPosition()).toEqual([2, 0]);

        lumine.commands.dispatch(editorElement, "bookmarks:jump-to-previous-bookmark");
        expect(editor.getLastCursor().getBufferPosition()).toEqual([2, 0]);

        editor.setCursorBufferPosition([5, 0]);

        lumine.commands.dispatch(editorElement, "bookmarks:jump-to-previous-bookmark");
        expect(editor.getLastCursor().getBufferPosition()).toEqual([2, 0]);
      });
    });

    describe("with bookmarks", () => {
      beforeEach(() => {
        editor.setCursorBufferPosition([2, 0]);
        lumine.commands.dispatch(editorElement, "bookmarks:toggle-bookmark");

        editor.setSelectedBufferRanges([
          [
            [8, 4],
            [10, 0],
          ],
        ]);
        lumine.commands.dispatch(editorElement, "bookmarks:toggle-bookmark");

        editor.setCursorBufferPosition([5, 0]);
        lumine.commands.dispatch(editorElement, "bookmarks:toggle-bookmark");
      });

      it("jump-to-next-bookmark finds next bookmark", () => {
        editor.setCursorBufferPosition([0, 0]);

        lumine.commands.dispatch(editorElement, "bookmarks:jump-to-next-bookmark");
        expect(editor.getLastCursor().getBufferPosition()).toEqual([2, 0]);

        lumine.commands.dispatch(editorElement, "bookmarks:jump-to-next-bookmark");
        expect(editor.getLastCursor().getBufferPosition()).toEqual([5, 0]);

        lumine.commands.dispatch(editorElement, "bookmarks:jump-to-next-bookmark");
        expect(editor.getLastCursor().getMarker().getBufferRange()).toEqual([
          [8, 4],
          [10, 0],
        ]);

        lumine.commands.dispatch(editorElement, "bookmarks:jump-to-next-bookmark");
        expect(editor.getLastCursor().getBufferPosition()).toEqual([2, 0]);

        editor.setCursorBufferPosition([11, 0]);

        lumine.commands.dispatch(editorElement, "bookmarks:jump-to-next-bookmark");
        expect(editor.getLastCursor().getBufferPosition()).toEqual([2, 0]);
      });

      it("jump-to-previous-bookmark finds previous bookmark", () => {
        editor.setCursorBufferPosition([0, 0]);

        lumine.commands.dispatch(editorElement, "bookmarks:jump-to-previous-bookmark");
        expect(editor.getLastCursor().getMarker().getBufferRange()).toEqual([
          [8, 4],
          [10, 0],
        ]);

        lumine.commands.dispatch(editorElement, "bookmarks:jump-to-previous-bookmark");
        expect(editor.getLastCursor().getBufferPosition()).toEqual([5, 0]);

        lumine.commands.dispatch(editorElement, "bookmarks:jump-to-previous-bookmark");
        expect(editor.getLastCursor().getBufferPosition()).toEqual([2, 0]);

        lumine.commands.dispatch(editorElement, "bookmarks:jump-to-previous-bookmark");
        expect(editor.getLastCursor().getMarker().getBufferRange()).toEqual([
          [8, 4],
          [10, 0],
        ]);

        editor.setCursorBufferPosition([11, 0]);

        lumine.commands.dispatch(editorElement, "bookmarks:jump-to-previous-bookmark");
        expect(editor.getLastCursor().getMarker().getBufferRange()).toEqual([
          [8, 4],
          [10, 0],
        ]);
      });
    });
  });

  describe("selecting bookmarks", () => {
    it("doesnt die when no bookmarks", () => {
      editor.setCursorBufferPosition([5, 10]);

      lumine.commands.dispatch(editorElement, "bookmarks:select-to-next-bookmark");
      expect(editor.getLastCursor().getBufferPosition()).toEqual([5, 10]);

      lumine.commands.dispatch(editorElement, "bookmarks:select-to-previous-bookmark");
      expect(editor.getLastCursor().getBufferPosition()).toEqual([5, 10]);
    });

    describe("with one bookmark", () => {
      beforeEach(() => {
        editor.setCursorBufferPosition([2, 0]);
        lumine.commands.dispatch(editorElement, "bookmarks:toggle-bookmark");
      });

      it("select-to-next-bookmark selects to the right place", () => {
        editor.setCursorBufferPosition([0, 0]);

        lumine.commands.dispatch(editorElement, "bookmarks:select-to-next-bookmark");
        expect(editor.getSelectedBufferRange()).toEqual([
          [0, 0],
          [2, 0],
        ]);
      });

      it("select-to-next-bookmark selects to the only bookmark", () => {
        editor.setCursorBufferPosition([4, 0]);

        lumine.commands.dispatch(editorElement, "bookmarks:select-to-next-bookmark");
        expect(editor.getSelectedBufferRange()).toEqual([
          [4, 0],
          [2, 0],
        ]);
      });

      it("select-to-previous-bookmark selects to the right place", () => {
        editor.setCursorBufferPosition([4, 0]);

        lumine.commands.dispatch(editorElement, "bookmarks:select-to-previous-bookmark");
        expect(editor.getSelectedBufferRange()).toEqual([
          [4, 0],
          [2, 0],
        ]);
      });

      it("select-to-previous-bookmark selects to the only bookmark", () => {
        editor.setCursorBufferPosition([0, 0]);

        lumine.commands.dispatch(editorElement, "bookmarks:select-to-previous-bookmark");
        expect(editor.getSelectedBufferRange()).toEqual([
          [0, 0],
          [2, 0],
        ]);
      });
    });
  });
  describe("anchoring on the caret", () => {
    const bookmarkRows = (rows) => {
      for (const row of rows) {
        editor.setCursorBufferPosition([row, 0]);
        lumine.commands.dispatch(editorElement, "bookmarks:toggle-bookmark");
      }
    };

    it("jumps forward from the caret, not from the top of the selection", () => {
      bookmarkRows([2, 8]);
      // Caret at the foot of a selection that starts above the first bookmark.
      editor.setSelectedBufferRange([
        [1, 0],
        [5, 0],
      ]);

      lumine.commands.dispatch(editorElement, "bookmarks:jump-to-next-bookmark");

      expect(editor.getSelectedBufferRange()).toEqual([
        [8, 0],
        [8, 0],
      ]);
    });

    it("jumps backward past the bookmark the caret is inside", () => {
      bookmarkRows([2, 5]);
      editor.setSelectedBufferRange([
        [8, 4],
        [10, 0],
      ]);
      lumine.commands.dispatch(editorElement, "bookmarks:toggle-bookmark");
      editor.setCursorBufferPosition([9, 0]);

      lumine.commands.dispatch(editorElement, "bookmarks:jump-to-previous-bookmark");

      expect(editor.getSelectedBufferRange()).toEqual([
        [5, 0],
        [5, 0],
      ]);
    });

    it("keeps extending the selection on repeated select-to-next-bookmark", () => {
      bookmarkRows([2, 5, 8]);
      editor.setCursorBufferPosition([0, 0]);

      const reached = [];
      for (let press = 0; press < 3; press++) {
        lumine.commands.dispatch(editorElement, "bookmarks:select-to-next-bookmark");
        reached.push(editor.getSelectedBufferRange().serialize());
      }

      // The second press used to collapse the selection onto the first
      // bookmark, so it alternated instead of reaching past one.
      expect(reached).toEqual([
        [
          [0, 0],
          [2, 0],
        ],
        [
          [0, 0],
          [5, 0],
        ],
        [
          [0, 0],
          [8, 0],
        ],
      ]);
    });

    it("keeps the selection reversed when selecting to a previous bookmark", () => {
      bookmarkRows([2, 5]);
      editor.setCursorBufferPosition([9, 0]);

      lumine.commands.dispatch(editorElement, "bookmarks:select-to-previous-bookmark");

      expect(editor.getSelectedBufferRange()).toEqual([
        [5, 0],
        [9, 0],
      ]);
      expect(editor.getLastSelection().isReversed()).toBe(true);
    });

    it("selects to the near edge of a multi-row bookmark", () => {
      editor.setSelectedBufferRange([
        [8, 4],
        [10, 0],
      ]);
      lumine.commands.dispatch(editorElement, "bookmarks:toggle-bookmark");
      editor.setCursorBufferPosition([2, 0]);

      lumine.commands.dispatch(editorElement, "bookmarks:select-to-next-bookmark");

      // The far edge swallowed the bookmark rather than reaching it.
      expect(editor.getSelectedBufferRange()).toEqual([
        [2, 0],
        [8, 4],
      ]);
    });
  });
});
