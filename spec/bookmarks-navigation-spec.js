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
    spyOn(lumine.notifications, "beep");
  });

  describe("jumping between bookmarks", () => {
    it("doesn't die when no bookmarks", () => {
      editor.setCursorBufferPosition([5, 10]);

      lumine.commands.dispatch(editorElement, "bookmarks:jump-to-next-bookmark");
      expect(editor.getLastCursor().getBufferPosition()).toEqual([5, 10]);
      expect(lumine.notifications.beep.calls.count()).toBe(1);

      lumine.commands.dispatch(editorElement, "bookmarks:jump-to-previous-bookmark");
      expect(editor.getLastCursor().getBufferPosition()).toEqual([5, 10]);
      expect(lumine.notifications.beep.calls.count()).toBe(2);
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
      expect(lumine.notifications.beep.calls.count()).toBe(1);

      lumine.commands.dispatch(editorElement, "bookmarks:select-to-previous-bookmark");
      expect(editor.getLastCursor().getBufferPosition()).toEqual([5, 10]);
      expect(lumine.notifications.beep.calls.count()).toBe(2);
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
});
