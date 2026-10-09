describe("Bookmarks for disjoint selections sharing rows", () => {
  let editor, bookmarks;

  beforeEach(async () => {
    for (const method of ["openExternal", "openPath", "showItemInFolder", "openApplication"]) {
      spyOn(lumine.shell, method).and.resolveTo();
    }
    spyOn(lumine.application, "openWindow").and.resolveTo();
    jasmine.attachToDOM(lumine.workspace.getElement());
    const pack = await lumine.packages.activatePackage("bookmarks");
    editor = await lumine.workspace.open();
    editor.setText("alpha\nbeta\ngamma\ndelta");
    bookmarks = pack.mainModule.provideBookmarks().getInstanceForEditor(editor);
  });

  it("includes the final rows of both selections in one bookmark", () => {
    editor.setSelectedBufferRanges([
      [
        [0, 0],
        [1, 1],
      ],
      [
        [1, 2],
        [2, 5],
      ],
    ]);
    expect(editor.getSelections().length).toBe(2);
    const changed = jasmine.createSpy("changed");
    const subscription = bookmarks.onDidChangeBookmarks(changed);
    try {
      lumine.commands.dispatch(editor.getElement(), "bookmarks:toggle-bookmark");
      const markers = bookmarks.getAllBookmarks();
      expect(markers.length).toBe(1);
      const range = markers[0].getBufferRange();
      expect([range.start.toArray(), range.end.toArray()]).toEqual([
        [0, 0],
        [2, 5],
      ]);
      expect(changed.calls.count()).toBe(1);
      lumine.commands.dispatch(editor.getElement(), "bookmarks:toggle-bookmark");
      expect(bookmarks.getAllBookmarks()).toEqual([]);
      expect(changed.calls.count()).toBe(2);
    } finally {
      subscription.dispose();
    }
  });

  it("includes every row in a chain of overlapping row ranges", () => {
    editor.setSelectedBufferRanges([
      [
        [0, 0],
        [1, 1],
      ],
      [
        [1, 2],
        [2, 1],
      ],
      [
        [2, 2],
        [3, 5],
      ],
    ]);
    expect(editor.getSelections().length).toBe(3);
    lumine.commands.dispatch(editor.getElement(), "bookmarks:toggle-bookmark");
    const markers = bookmarks.getAllBookmarks();
    expect(markers.length).toBe(1);
    const range = markers[0].getBufferRange();
    expect([range.start.toArray(), range.end.toArray()]).toEqual([
      [0, 0],
      [3, 5],
    ]);
  });
});
