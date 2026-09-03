describe("Bookmarks view", () => {
  let workspaceElement, editorElement, editor;

  function nextAction(list) {
    return new Promise((resolve) => {
      const subscription = list.onDidFinishAction((event) => {
        subscription.dispose();
        resolve(event);
      });
    });
  }

  beforeEach(async () => {
    spyOn(window, "setImmediate").and.callFake((fn) => fn());
    workspaceElement = lumine.views.getView(lumine.workspace);

    await lumine.workspace.open("sample.js");

    await lumine.packages.activatePackage("bookmarks");

    jasmine.attachToDOM(workspaceElement);
    editor = lumine.workspace.getActiveTextEditor();
    editorElement = lumine.views.getView(editor);
  });

  describe("browsing bookmarks", () => {
    it("displays a select list of all bookmarks", async () => {
      editor.setCursorBufferPosition([0]);
      lumine.commands.dispatch(editorElement, "bookmarks:toggle-bookmark");
      editor.setCursorBufferPosition([2]);
      lumine.commands.dispatch(editorElement, "bookmarks:toggle-bookmark");
      editor.setCursorBufferPosition([4]);
      lumine.commands.dispatch(editorElement, "bookmarks:toggle-bookmark");

      await lumine.commands.dispatch(workspaceElement, "bookmarks:view-all");

      const bookmarkNodes = workspaceElement.querySelectorAll(".bookmark");
      expect(bookmarkNodes.length).toBe(3);
      const list = workspaceElement.querySelector(".bookmarks-view").getModel();
      expect(list.getActions()).toContain(
        jasmine.objectContaining({
          command: "bookmarks:open-bookmark",
          context: "item",
          primary: true,
          disposition: "close",
        }),
      );
      expect(new Set(list.getItems().map((item) => list.getItemId(item))).size).toBe(3);
      expect(bookmarkNodes[0].querySelector(".primary-line").textContent).toBe("sample.js:1");
      expect(bookmarkNodes[0].querySelector(".secondary-line").textContent).toBe(
        "var quicksort = function () {",
      );
      expect(bookmarkNodes[0].querySelector(".secondary-line").classList).toContain("line-text");
      expect(bookmarkNodes[1].querySelector(".primary-line").textContent).toBe("sample.js:3");
      expect(bookmarkNodes[1].querySelector(".secondary-line").textContent).toBe(
        "if (items.length <= 1) return items;",
      );
      expect(bookmarkNodes[2].querySelector(".primary-line").textContent).toBe("sample.js:5");
      expect(bookmarkNodes[2].querySelector(".secondary-line").textContent).toBe(
        "while(items.length > 0) {",
      );
    });

    describe("when a bookmark is selected", () => {
      let editor2;

      beforeEach(async () => {
        editor2 = await lumine.workspace.open("sample.coffee");
      });

      it("sets the cursor to the location of the bookmark and activates the right editor", async () => {
        editor.setCursorBufferPosition([8]);
        lumine.commands.dispatch(editorElement, "bookmarks:toggle-bookmark");
        editor.setCursorBufferPosition([0]);

        lumine.workspace.paneForItem(editor2).activateItem(editor2);
        await lumine.commands.dispatch(workspaceElement, "bookmarks:view-all");

        const bookmarkElement = workspaceElement.querySelector(".bookmarks-view .bookmark");
        const list = bookmarkElement.closest(".bookmarks-view").getModel();

        const open = spyOn(lumine.workspace, "open").and.callThrough();
        const action = nextAction(list);
        lumine.commands.dispatch(bookmarkElement, "core:confirm");
        expect((await action).status).toBe("success");

        expect(lumine.workspace.getActiveTextEditor()).toEqual(editor);
        expect(editor.getCursorBufferPosition()).toEqual([8, 0]);
        expect(open).toHaveBeenCalledWith(editor, { searchAllPanes: true });
      });

      it("searches for the bookmark among all panes and editors", async () => {
        editor.setCursorBufferPosition([8]);
        lumine.commands.dispatch(editorElement, "bookmarks:toggle-bookmark");
        editor.setCursorBufferPosition([0]);

        lumine.workspace.paneForItem(editor2).activateItem(editor2);
        const pane1 = lumine.workspace.getActivePane();
        pane1.splitRight();
        expect(lumine.workspace.getActivePane()).not.toEqual(pane1);

        await lumine.commands.dispatch(workspaceElement, "bookmarks:view-all");

        const bookmarkElement = workspaceElement.querySelector(".bookmarks-view .bookmark");
        const list = bookmarkElement.closest(".bookmarks-view").getModel();

        const action = nextAction(list);
        lumine.commands.dispatch(bookmarkElement, "core:confirm");
        expect((await action).status).toBe("success");

        expect(lumine.workspace.getActiveTextEditor()).toEqual(editor);
        expect(editor.getCursorBufferPosition()).toEqual([8, 0]);
      });
    });
  });
  describe("filtering the bookmark list", () => {
    beforeEach(async () => {
      editor.setCursorBufferPosition([2, 0]);
      lumine.commands.dispatch(editorElement, "bookmarks:toggle-bookmark");
      editor.setCursorBufferPosition([6, 0]);
      lumine.commands.dispatch(editorElement, "bookmarks:toggle-bookmark");
      await lumine.commands.dispatch(workspaceElement, "bookmarks:view-all");
    });

    it("filters on the line number the row shows", async () => {
      const list = workspaceElement.querySelector(".bookmarks-view");
      expect(list.querySelectorAll(".bookmark").length).toBe(2);
      expect(list.querySelector(".primary-line").textContent).toBe("sample.js:3");

      // The filter carried the zero-based row while the row rendered the
      // one-based one, so the number a user reads matched nothing.
      list.querySelector("lumine-text-editor[mini]").getModel().setText("sample.js:3");
      await lumine.views.getNextUpdatePromise();

      expect(list.querySelectorAll(".bookmark").length).toBe(1);
    });

    it("does nothing when the bookmarked editor has been destroyed", async () => {
      const list = workspaceElement.querySelector(".bookmarks-view");
      // The list is built when it opens, so its editor can be gone by the
      // time a row is confirmed. Confirming used to dereference the pane the
      // workspace no longer has for it.
      editor.destroy();

      const action = nextAction(list.getModel());
      lumine.commands.dispatch(list, "core:confirm");
      expect((await action).status).toBe("success");

      expect(lumine.workspace.getModalPanels().some((panel) => panel.isVisible())).toBe(false);
      expect(lumine.workspace.getActivePaneItem()).toBeUndefined();
    });
  });
});
