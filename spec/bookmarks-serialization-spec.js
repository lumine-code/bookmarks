describe("Bookmarks serialization", () => {
  let workspaceElement, editorElement, editor, bookmarks;

  const bookmarkedRangesForEditor = (editor) => {
    const decorationsById = editor.decorationsStateForScreenRowRange(0, editor.getLastScreenRow());
    const decorations = Object.keys(decorationsById).map((key) => decorationsById[key]);
    return decorations
      .filter((decoration) => decoration.properties.class === "bookmarked")
      .filter((decoration) => decoration.properties.type === "line-number")
      .map((decoration) => decoration.screenRange);
  };

  beforeEach(async () => {
    spyOn(window, "setImmediate").and.callFake((fn) => fn());
    workspaceElement = lumine.views.getView(lumine.workspace);

    await lumine.workspace.open("sample.js");

    bookmarks = (await lumine.packages.activatePackage("bookmarks")).mainModule;

    jasmine.attachToDOM(workspaceElement);
    editor = lumine.workspace.getActiveTextEditor();
    editorElement = lumine.views.getView(editor);
    spyOn(lumine.notifications, "beep");
  });

  describe("serializing/deserializing bookmarks", () => {
    let [editor2, editorElement2] = [];

    beforeEach(async () => {
      editor2 = await lumine.workspace.open("sample.coffee");
      editorElement2 = lumine.views.getView(editor2);
    });

    it("restores bookmarks on all the previously open editors", () => {
      editor.setCursorScreenPosition([1, 2]);
      lumine.commands.dispatch(editorElement, "bookmarks:toggle-bookmark");
      editor2.setCursorScreenPosition([4, 5]);
      lumine.commands.dispatch(editorElement2, "bookmarks:toggle-bookmark");

      expect(bookmarkedRangesForEditor(editor)).toEqual([
        [
          [1, 2],
          [1, 2],
        ],
      ]);
      expect(bookmarkedRangesForEditor(editor2)).toEqual([
        [
          [4, 5],
          [4, 5],
        ],
      ]);

      const state = bookmarks.serialize();
      bookmarks.deactivate();
      lumine.commands.dispatch(editorElement, "bookmarks:toggle-bookmark");
      lumine.commands.dispatch(editorElement2, "bookmarks:toggle-bookmark");

      // toggling the bookmark has no effect when the package is deactivated.
      expect(bookmarkedRangesForEditor(editor)).toEqual([]);
      expect(bookmarkedRangesForEditor(editor2)).toEqual([]);

      bookmarks.activate(state);

      expect(bookmarkedRangesForEditor(editor)).toEqual([
        [
          [1, 2],
          [1, 2],
        ],
      ]);
      expect(bookmarkedRangesForEditor(editor2)).toEqual([
        [
          [4, 5],
          [4, 5],
        ],
      ]);

      lumine.commands.dispatch(editorElement, "bookmarks:toggle-bookmark");
      lumine.commands.dispatch(editorElement2, "bookmarks:toggle-bookmark");

      expect(bookmarkedRangesForEditor(editor)).toEqual([]);
      expect(bookmarkedRangesForEditor(editor2)).toEqual([]);
    });
  });
});
