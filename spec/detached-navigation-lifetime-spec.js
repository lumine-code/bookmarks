describe("Bookmark navigation presentation lifetime", () => {
  let view;

  afterEach(async () => {
    view?.destroy();
    await lumine.workspace.discardEditorWindows();
  });

  it("navigates to a live bookmark in another presentation", async () => {
    jasmine.attachToDOM(lumine.workspace.getElement());
    const editor = await lumine.workspace.open();
    editor.setText("one\ntwo\n");
    const marker = editor.markBufferRange([
      [1, 0],
      [1, 3],
    ]);
    const extra = await lumine.workspace.openEditorWindow({ show: false });
    await lumine.workspace.movePaneItem(editor, {
      targetPane: extra.getEditorContainer().getActivePane(),
    });
    const BookmarksView = require("../lib/bookmarks-view");
    view = new BookmarksView([], lumine.workspace.getMainWindow());
    const show = spyOn(extra, "show").and.resolveTo();
    const focus = spyOn(extra, "focus").and.resolveTo();
    await view.openBookmark({ editor, marker });
    expect(show).toHaveBeenCalled();
    expect(focus).toHaveBeenCalled();
    expect(editor.getSelectedText()).toBe("two");
  });

  for (const stage of ["show", "focus"]) {
    it(`cancels navigation if its editor moves while native ${stage} is pending`, async () => {
      jasmine.attachToDOM(lumine.workspace.getElement());
      const editor = await lumine.workspace.open();
      editor.setText("one\ntwo\n");
      editor.setCursorBufferPosition([0, 0]);
      const marker = editor.markBufferRange([
        [1, 0],
        [1, 3],
      ]);
      const main = lumine.workspace.getMainWindow();
      const extra = await lumine.workspace.openEditorWindow({ show: false });
      const BookmarksView = require("../lib/bookmarks-view");
      view = new BookmarksView([], main);
      let entered, release;
      const pending = new Promise((resolve) => (entered = resolve));
      const gate = new Promise((resolve) => (release = resolve));
      const focus = spyOn(main, "focus").and.resolveTo();
      const show = spyOn(main, "show").and.resolveTo();
      (stage === "show" ? show : focus).and.callFake(() => {
        entered();
        return gate;
      });
      const opening = view.openBookmark({ editor, marker });
      await pending;
      await lumine.workspace.movePaneItem(editor, {
        targetPane: extra.getEditorContainer().getActivePane(),
      });
      release();
      await opening;
      expect(editor.getCursorBufferPosition().toArray()).toEqual([0, 0]);
      if (stage === "show") expect(focus).not.toHaveBeenCalled();
    });
  }
});
