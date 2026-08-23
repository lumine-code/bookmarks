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

    it("uses each serialized entry once", () => {
      editor.setCursorBufferPosition([1, 2]);
      lumine.commands.dispatch(editorElement, "bookmarks:toggle-bookmark");

      const state = bookmarks.serialize();
      expect(state[editor.id]).toBeDefined();

      bookmarks.deactivate();
      bookmarks.activate(state);

      // Otherwise a later editor landing on the same id adopts an entry meant
      // for an editor that is gone.
      expect(state[editor.id]).toBeUndefined();
    });
  });

  // The package persists a marker layer id and lets the markers themselves ride
  // the buffer's serialized state, which only happens because the layer is
  // marked persistent. Nothing else in the suite would notice if it were not.
  describe("crossing the buffer's serialization boundary", () => {
    let layerId;

    beforeEach(() => {
      editor.setCursorBufferPosition([2, 4]);
      lumine.commands.dispatch(editorElement, "bookmarks:toggle-bookmark");
      layerId = bookmarks.serialize()[editor.id].markerLayerId;
    });

    it("writes the bookmark marker layer into the buffer's serialized state", () => {
      const state = editor.getBuffer().serialize();

      expect(state.markerLayers[layerId]).toBeDefined();
      expect(Object.keys(state.markerLayers[layerId].markersById).length).toBe(1);
    });

    it("restores the bookmark's range and validity through a buffer round trip", async () => {
      const TextBuffer = editor.getBuffer().constructor;
      const markerId = bookmarks.bookmarksProvider.getBookmarksForEditor(editor)[0].id;

      const restored = await TextBuffer.deserialize(editor.getBuffer().serialize());
      try {
        const marker = restored.getMarkerLayer(layerId).getMarker(markerId);

        expect(marker.getRange()).toEqual([
          [2, 4],
          [2, 4],
        ]);
        expect(marker.isValid()).toBe(true);
      } finally {
        restored.destroy();
      }
    });
  });

  describe("bookmarks restored from a previous session", () => {
    const restore = () => {
      const state = bookmarks.serialize();
      bookmarks.deactivate();
      return state;
    };

    it("destroys a restored bookmark that a later edit invalidates", () => {
      editor.setText("a\nb\nc\nd\ne\nf\ng\nh\n");
      editor.setCursorBufferPosition([3, 0]);
      lumine.commands.dispatch(editorElement, "bookmarks:toggle-bookmark");

      bookmarks.activate(restore());
      expect(bookmarks.bookmarksProvider.getBookmarksForEditor(editor).length).toBe(1);

      editor.getBuffer().delete([
        [2, 0],
        [5, 0],
      ]);

      // A restored marker used to keep no invalidation handler at all, so this
      // left one the gutter stops drawing and every count still reports.
      expect(bookmarks.bookmarksProvider.getBookmarksForEditor(editor)).toEqual([]);
      expect(bookmarkedRangesForEditor(editor)).toEqual([]);
    });

    it("drops a bookmark that was already invalid when the layer was restored", () => {
      editor.setText("a\nb\nc\nd\ne\nf\ng\nh\n");
      editor.setCursorBufferPosition([3, 0]);
      lumine.commands.dispatch(editorElement, "bookmarks:toggle-bookmark");

      const state = restore();
      // With the package down, so nothing reacts to the invalidation. This is
      // the state a session saved before the fix comes back in.
      editor.getBuffer().delete([
        [2, 0],
        [5, 0],
      ]);
      bookmarks.activate(state);

      expect(bookmarks.bookmarksProvider.getBookmarksForEditor(editor)).toEqual([]);
      expect(bookmarkedRangesForEditor(editor)).toEqual([]);
    });
  });
});
