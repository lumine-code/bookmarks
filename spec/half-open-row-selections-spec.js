describe("Bookmarks for half-open line selections", () => {
  let editor, instance;
  beforeEach(async () => {
    for (const method of ["openExternal", "openPath", "showItemInFolder", "openApplication"]) {
      spyOn(lumine.shell, method).and.resolveTo();
    }
    spyOn(lumine.application, "openWindow").and.resolveTo();
    jasmine.attachToDOM(lumine.workspace.getElement());
    const pack = await lumine.packages.activatePackage("bookmarks");
    editor = await lumine.workspace.open();
    editor.setText("first\nsecond\nthird");
    instance = pack.mainModule.provideBookmarks().getInstanceForEditor(editor);
  });

  it("does not toggle the bookmark on the following unselected line", () => {
    editor.setCursorBufferPosition([1, 1]);
    lumine.commands.dispatch(editor.getElement(), "bookmarks:toggle-bookmark");
    const following = instance.getAllBookmarks()[0];
    editor.setSelectedBufferRange([
      [0, 0],
      [1, 0],
    ]);
    expect(editor.getSelectedText()).toBe("first\n");
    lumine.commands.dispatch(editor.getElement(), "bookmarks:toggle-bookmark");
    expect(following.isDestroyed()).toBe(false);
    expect(instance.getAllBookmarks().length).toBe(2);
  });

  it("still toggles an empty selection at column zero on its own line", () => {
    editor.setCursorBufferPosition([1, 0]);
    lumine.commands.dispatch(editor.getElement(), "bookmarks:toggle-bookmark");
    const bookmark = instance.getAllBookmarks()[0];
    expect(bookmark.getStartBufferPosition().toArray()).toEqual([1, 0]);
    lumine.commands.dispatch(editor.getElement(), "bookmarks:toggle-bookmark");
    expect(instance.getAllBookmarks().length).toBe(0);
  });

  it("keeps disjoint selections on adjacent physical lines as separate bookmarks", () => {
    editor.setSelectedBufferRanges([
      [
        [0, 0],
        [1, 0],
      ],
      [
        [1, 1],
        [1, 4],
      ],
    ]);
    expect(editor.getSelections().length).toBe(2);
    lumine.commands.dispatch(editor.getElement(), "bookmarks:toggle-bookmark");
    expect(instance.getAllBookmarks().length).toBe(2);
  });

  it("finds the preceding physical line instead of wrapping to a later bookmark", () => {
    editor.setSelectedBufferRange([
      [0, 0],
      [1, 0],
    ]);
    lumine.commands.dispatch(editor.getElement(), "bookmarks:toggle-bookmark");
    editor.setCursorBufferPosition([2, 1]);
    lumine.commands.dispatch(editor.getElement(), "bookmarks:toggle-bookmark");
    editor.setCursorBufferPosition([1, 1]);
    lumine.commands.dispatch(editor.getElement(), "bookmarks:jump-to-previous-bookmark");
    expect(editor.getSelectedText()).toBe("first\n");
  });

  it("labels a whole-line bookmark by its selected line in the picker", async () => {
    editor.setSelectedBufferRange([
      [0, 0],
      [1, 0],
    ]);
    lumine.commands.dispatch(editor.getElement(), "bookmarks:toggle-bookmark");
    await lumine.commands.dispatch(lumine.workspace.getElement(), "bookmarks:view-all");
    const main = lumine.packages.getActivePackage("bookmarks").mainModule;
    expect(main.bookmarksView.selectList.getItems()[0].filterText).toContain("untitled:1 ");
    expect(
      main.bookmarksView.selectList.getElement().querySelector(".primary-text").textContent,
    ).toBe("untitled:1");
  });
});
