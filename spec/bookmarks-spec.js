describe("Bookmarks", () => {
  let workspaceElement, editorElement, editor, bookmarks, provider;

  const bookmarkedRangesForEditor = (editor) => {
    const decorationsById = editor.decorationsStateForScreenRowRange(0, editor.getLastScreenRow());
    const decorations = Object.keys(decorationsById).map((key) => decorationsById[key]);
    return decorations
      .filter((decoration) => decoration.properties.class === "bookmarked")
      .filter((decoration) => decoration.properties.type === "line-number")
      .map((decoration) => decoration.screenRange);
  };

  const getBookmarkedLineNodes = (editorElement) =>
    editorElement.querySelectorAll(".line-number.bookmarked");

  beforeEach(async () => {
    spyOn(window, "setImmediate").and.callFake((fn) => fn());
    workspaceElement = lumine.views.getView(lumine.workspace);

    await lumine.workspace.open("sample.js");

    bookmarks = (await lumine.packages.activatePackage("bookmarks")).mainModule;
    provider = bookmarks.bookmarksProvider;

    jasmine.attachToDOM(workspaceElement);
    editor = lumine.workspace.getActiveTextEditor();
    editorElement = lumine.views.getView(editor);
  });

  describe("toggling bookmarks", () => {
    describe("point marker bookmark", () => {
      it("creates a marker when toggled", () => {
        editor.setCursorBufferPosition([3, 10]);
        expect(bookmarkedRangesForEditor(editor)).toEqual([]);
        lumine.commands.dispatch(editorElement, "bookmarks:toggle-bookmark");
        expect(bookmarkedRangesForEditor(editor)).toEqual([
          [
            [3, 10],
            [3, 10],
          ],
        ]);

        let marks = provider.getBookmarksForEditor(editor);
        expect(marks.length).toBe(1);
        expect(marks.map((m) => m.getScreenRange())).toEqual(bookmarkedRangesForEditor(editor));
      });

      it("removes marker when toggled", () => {
        let callback = jasmine.createSpy();

        let instance = provider.getInstanceForEditor(editor);
        instance.onDidChangeBookmarks(callback);

        editor.setCursorBufferPosition([3, 10]);
        expect(bookmarkedRangesForEditor(editor).length).toBe(0);

        lumine.commands.dispatch(editorElement, "bookmarks:toggle-bookmark");
        expect(bookmarkedRangesForEditor(editor).length).toBe(1);
        expect(callback.calls.count()).toBe(1);

        lumine.commands.dispatch(editorElement, "bookmarks:toggle-bookmark");
        expect(bookmarkedRangesForEditor(editor).length).toBe(0);
        expect(callback.calls.count()).toBe(2);
      });
    });

    describe("multiple point marker bookmark", () => {
      it("creates multiple markers when toggled", () => {
        editor.setCursorBufferPosition([3, 10]);
        editor.addCursorAtBufferPosition([6, 11]);
        expect(bookmarkedRangesForEditor(editor)).toEqual([]);
        lumine.commands.dispatch(editorElement, "bookmarks:toggle-bookmark");
        expect(bookmarkedRangesForEditor(editor)).toEqual([
          [
            [3, 10],
            [3, 10],
          ],
          [
            [6, 11],
            [6, 11],
          ],
        ]);
        let instance = provider.getInstanceForEditor(editor);
        expect(instance.getAllBookmarks().length).toBe(2);
      });

      it("removes multiple markers when toggled", () => {
        editor.setCursorBufferPosition([3, 10]);
        editor.addCursorAtBufferPosition([6, 11]);
        expect(bookmarkedRangesForEditor(editor).length).toBe(0);
        lumine.commands.dispatch(editorElement, "bookmarks:toggle-bookmark");
        expect(bookmarkedRangesForEditor(editor).length).toBe(2);
        lumine.commands.dispatch(editorElement, "bookmarks:toggle-bookmark");
        expect(bookmarkedRangesForEditor(editor).length).toBe(0);
      });

      it("adds and removes multiple markers at the same time", () => {
        editor.setCursorBufferPosition([3, 10]);
        expect(bookmarkedRangesForEditor(editor).length).toBe(0);
        lumine.commands.dispatch(editorElement, "bookmarks:toggle-bookmark");
        expect(bookmarkedRangesForEditor(editor)).toEqual([
          [
            [3, 10],
            [3, 10],
          ],
        ]);

        editor.addCursorAtBufferPosition([6, 11]);
        lumine.commands.dispatch(editorElement, "bookmarks:toggle-bookmark");
        expect(bookmarkedRangesForEditor(editor)).toEqual([
          [
            [6, 11],
            [6, 11],
          ],
        ]);

        editor.addCursorAtBufferPosition([8, 8]);
        editor.addCursorAtBufferPosition([11, 8]);
        lumine.commands.dispatch(editorElement, "bookmarks:toggle-bookmark");
        expect(bookmarkedRangesForEditor(editor)).toEqual([
          [
            [3, 10],
            [3, 10],
          ],
          [
            [8, 8],
            [8, 8],
          ],
          [
            [11, 8],
            [11, 8],
          ],
        ]);

        // reset cursors, and try multiple cursors on same line but different ranges
        editor.setCursorBufferPosition([8, 40]);
        lumine.commands.dispatch(editorElement, "bookmarks:toggle-bookmark");
        expect(bookmarkedRangesForEditor(editor)).toEqual([
          [
            [3, 10],
            [3, 10],
          ],
          [
            [11, 8],
            [11, 8],
          ],
        ]);

        editor.addCursorAtBufferPosition([3, 0]);
        editor.addCursorAtBufferPosition([11, 0]);
        lumine.commands.dispatch(editorElement, "bookmarks:toggle-bookmark");
        expect(bookmarkedRangesForEditor(editor)).toEqual([
          [
            [8, 40],
            [8, 40],
          ],
        ]);

        editor.setCursorBufferPosition([8, 0]);
        lumine.commands.dispatch(editorElement, "bookmarks:toggle-bookmark");
        expect(bookmarkedRangesForEditor(editor).length).toBe(0);
      });
    });

    describe("single line range marker bookmark", () => {
      it("created a marker when toggled", () => {
        editor.setSelectedBufferRanges([
          [
            [3, 5],
            [3, 10],
          ],
        ]);
        expect(bookmarkedRangesForEditor(editor)).toEqual([]);

        lumine.commands.dispatch(editorElement, "bookmarks:toggle-bookmark");

        expect(bookmarkedRangesForEditor(editor)).toEqual([
          [
            [3, 5],
            [3, 10],
          ],
        ]);
      });

      it("removes marker when toggled", () => {
        editor.setSelectedBufferRanges([
          [
            [3, 5],
            [3, 10],
          ],
        ]);
        expect(bookmarkedRangesForEditor(editor).length).toBe(0);

        lumine.commands.dispatch(editorElement, "bookmarks:toggle-bookmark");
        expect(bookmarkedRangesForEditor(editor).length).toBe(1);

        lumine.commands.dispatch(editorElement, "bookmarks:toggle-bookmark");
        expect(bookmarkedRangesForEditor(editor).length).toBe(0);
      });
    });

    describe("multi line range marker bookmark", () => {
      it("created a marker when toggled", () => {
        editor.setSelectedBufferRanges([
          [
            [1, 5],
            [3, 10],
          ],
        ]);
        expect(bookmarkedRangesForEditor(editor)).toEqual([]);

        lumine.commands.dispatch(editorElement, "bookmarks:toggle-bookmark");

        expect(bookmarkedRangesForEditor(editor)).toEqual([
          [
            [1, 5],
            [3, 10],
          ],
        ]);
      });

      it("removes marker when toggled", () => {
        editor.setSelectedBufferRanges([
          [
            [1, 5],
            [3, 10],
          ],
        ]);
        expect(bookmarkedRangesForEditor(editor).length).toBe(0);

        lumine.commands.dispatch(editorElement, "bookmarks:toggle-bookmark");
        expect(bookmarkedRangesForEditor(editor).length).toBe(1);

        lumine.commands.dispatch(editorElement, "bookmarks:toggle-bookmark");
        expect(bookmarkedRangesForEditor(editor).length).toBe(0);
      });

      it("removes marker when toggled inside bookmark", () => {
        editor.setSelectedBufferRanges([
          [
            [1, 5],
            [3, 10],
          ],
        ]);
        expect(bookmarkedRangesForEditor(editor).length).toBe(0);

        lumine.commands.dispatch(editorElement, "bookmarks:toggle-bookmark");
        expect(bookmarkedRangesForEditor(editor).length).toBe(1);

        editor.setCursorBufferPosition([2, 2]);
        lumine.commands.dispatch(editorElement, "bookmarks:toggle-bookmark");
        expect(bookmarkedRangesForEditor(editor).length).toBe(0);
      });

      it("removes marker when toggled outside bookmark on start row", () => {
        editor.setSelectedBufferRanges([
          [
            [1, 5],
            [3, 10],
          ],
        ]);
        expect(bookmarkedRangesForEditor(editor).length).toBe(0);

        lumine.commands.dispatch(editorElement, "bookmarks:toggle-bookmark");
        expect(bookmarkedRangesForEditor(editor).length).toBe(1);

        editor.setCursorBufferPosition([1, 2]);
        lumine.commands.dispatch(editorElement, "bookmarks:toggle-bookmark");
        expect(bookmarkedRangesForEditor(editor).length).toBe(0);
      });

      it("removes marker when toggled outside bookmark on end row", () => {
        editor.setSelectedBufferRanges([
          [
            [1, 5],
            [3, 8],
          ],
        ]);
        expect(bookmarkedRangesForEditor(editor).length).toBe(0);

        lumine.commands.dispatch(editorElement, "bookmarks:toggle-bookmark");
        expect(bookmarkedRangesForEditor(editor).length).toBe(1);

        editor.setCursorBufferPosition([3, 10]);
        lumine.commands.dispatch(editorElement, "bookmarks:toggle-bookmark");
        expect(bookmarkedRangesForEditor(editor).length).toBe(0);
      });
    });

    it("toggles proper classes on proper gutter, line row and highlight on point bookmark", () => {
      editor.setCursorBufferPosition([3, 10]);
      expect(getBookmarkedLineNodes(editorElement).length).toBe(0);

      lumine.commands.dispatch(editorElement, "bookmarks:toggle-bookmark");
      let lines = getBookmarkedLineNodes(editorElement);

      expect(editorElement.querySelectorAll(".highlight.bookmarked").length).toBe(0);
      expect(editorElement.querySelectorAll(".line.bookmarked").length).toBe(1);
      expect(editorElement.querySelectorAll(".line-number.bookmarked").length).toBe(1);
      expect(lines[0]).toHaveData("buffer-row", 3);

      lumine.commands.dispatch(editorElement, "bookmarks:toggle-bookmark");

      expect(editorElement.querySelectorAll(".highlight.bookmarked").length).toBe(0);
      expect(editorElement.querySelectorAll(".line.bookmarked").length).toBe(0);
      expect(editorElement.querySelectorAll(".line-number.bookmarked").length).toBe(0);
    });

    it("toggles proper classes on proper gutter, line row and highlight on range bookmark", () => {
      editor.setSelectedBufferRanges([
        [
          [3, 5],
          [3, 10],
        ],
      ]);
      expect(editorElement.querySelectorAll(".bookmarked").length).toBe(0);

      lumine.commands.dispatch(editorElement, "bookmarks:toggle-bookmark");
      let lines = getBookmarkedLineNodes(editorElement);

      expect(editorElement.querySelectorAll(".highlight.bookmarked").length).toBe(1);
      expect(editorElement.querySelectorAll(".line.bookmarked").length).toBe(1);
      expect(editorElement.querySelectorAll(".line-number.bookmarked").length).toBe(1);
      expect(lines[0]).toHaveData("buffer-row", 3);

      lumine.commands.dispatch(editorElement, "bookmarks:toggle-bookmark");

      expect(editorElement.querySelectorAll(".highlight.bookmarked").length).toBe(0);
      expect(editorElement.querySelectorAll(".line.bookmarked").length).toBe(0);
      expect(editorElement.querySelectorAll(".line-number.bookmarked").length).toBe(0);
    });

    it("clears all bookmarks", () => {
      let callback = jasmine.createSpy();
      let instance = provider.getInstanceForEditor(editor);
      instance.onDidChangeBookmarks(callback);

      editor.setCursorBufferPosition([3, 10]);
      lumine.commands.dispatch(editorElement, "bookmarks:toggle-bookmark");
      expect(callback.calls.count()).toBe(1);

      editor.setCursorBufferPosition([5, 0]);
      lumine.commands.dispatch(editorElement, "bookmarks:toggle-bookmark");
      expect(callback.calls.count()).toBe(2);

      lumine.commands.dispatch(editorElement, "bookmarks:clear-bookmarks");
      expect(getBookmarkedLineNodes(editorElement).length).toBe(0);
      expect(callback.calls.count()).toBe(3);
    });
  });

  describe("when a bookmark is invalidated", () => {
    it("creates a marker when toggled", () => {
      let callback = jasmine.createSpy();
      let instance = provider.getInstanceForEditor(editor);
      instance.onDidChangeBookmarks(callback);
      editor.setCursorBufferPosition([3, 10]);
      expect(bookmarkedRangesForEditor(editor).length).toBe(0);

      lumine.commands.dispatch(editorElement, "bookmarks:toggle-bookmark");
      expect(bookmarkedRangesForEditor(editor).length).toBe(1);
      expect(callback.calls.count()).toBe(1);

      editor.setText("");
      expect(bookmarkedRangesForEditor(editor).length).toBe(0);
      expect(callback.calls.count()).toBe(2);
    });
  });

  describe("when inserting text next to the bookmark", () => {
    beforeEach(() => {
      editor.setSelectedBufferRanges([
        [
          [3, 10],
          [3, 25],
        ],
      ]);
      expect(bookmarkedRangesForEditor(editor).length).toBe(0);

      lumine.commands.dispatch(editorElement, "bookmarks:toggle-bookmark");
      expect(bookmarkedRangesForEditor(editor).length).toBe(1);
    });

    it("moves the bookmarked range forward when typing in the start", () => {
      editor.setCursorBufferPosition([3, 10]);
      editor.insertText("Hello");
      editor.setCursorBufferPosition([0, 0]);

      lumine.commands.dispatch(editorElement, "bookmarks:jump-to-next-bookmark");
      expect(editor.getLastCursor().getMarker().getBufferRange()).toEqual([
        [3, 15],
        [3, 30],
      ]);
    });

    it("doesnt extend the bookmarked range when typing in the end", () => {
      editor.setCursorBufferPosition([3, 25]);
      editor.insertText("Hello");
      editor.setCursorBufferPosition([0, 0]);

      lumine.commands.dispatch(editorElement, "bookmarks:jump-to-next-bookmark");
      expect(editor.getLastCursor().getMarker().getBufferRange()).toEqual([
        [3, 10],
        [3, 25],
      ]);
    });
  });
  describe("housekeeping", () => {
    it("does not accumulate subscriptions as bookmarks are toggled on and off", () => {
      const instance = provider.getInstanceForEditor(editor);
      const subscriptionCount = () => instance.disposables.disposables.size;
      const before = subscriptionCount();

      for (let cycle = 0; cycle < 25; cycle++) {
        editor.setCursorBufferPosition([3, 0]);
        lumine.commands.dispatch(editorElement, "bookmarks:toggle-bookmark");
        lumine.commands.dispatch(editorElement, "bookmarks:toggle-bookmark");
      }

      // Each bookmark used to leave its invalidation subscription behind in the
      // editor-lifetime composite, so this grew by one per bookmark ever made.
      expect(instance.getAllBookmarks()).toEqual([]);
      expect(subscriptionCount()).toBe(before);
    });

    it("bookmarks a row that two cursors share", () => {
      editor.setCursorBufferPosition([3, 0]);
      editor.addCursorAtBufferPosition([3, 10]);

      lumine.commands.dispatch(editorElement, "bookmarks:toggle-bookmark");

      // The second cursor used to find what the first had just created and
      // destroy it, so a row two cursors shared could not be bookmarked.
      expect(provider.getBookmarksForEditor(editor).length).toBe(1);
    });

    it("emits did-change-bookmarks once per toggle however many cursors there are", () => {
      const callback = jasmine.createSpy();
      provider.getInstanceForEditor(editor).onDidChangeBookmarks(callback);

      editor.setCursorBufferPosition([1, 0]);
      editor.addCursorAtBufferPosition([4, 0]);
      editor.addCursorAtBufferPosition([7, 0]);
      lumine.commands.dispatch(editorElement, "bookmarks:toggle-bookmark");

      expect(provider.getBookmarksForEditor(editor).length).toBe(3);
      expect(callback.calls.count()).toBe(1);
    });

    it("emits did-change-bookmarks once for an edit that invalidates several", () => {
      for (const row of [3, 6, 9]) {
        editor.setCursorBufferPosition([row, 2]);
        lumine.commands.dispatch(editorElement, "bookmarks:toggle-bookmark");
      }
      const callback = jasmine.createSpy();
      provider.getInstanceForEditor(editor).onDidChangeBookmarks(callback);

      editor.getBuffer().delete([
        [2, 0],
        [11, 0],
      ]);

      expect(provider.getBookmarksForEditor(editor)).toEqual([]);
      expect(callback.calls.count()).toBe(1);
    });
  });
});
