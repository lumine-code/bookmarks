describe("Bookmarks provider", () => {
  let workspaceElement, editorElement, editor, bookmarks, provider;

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

  it("publishes the service the manifest declares", () => {
    const { providedServices } = require("../package.json");

    expect(Object.keys(providedServices)).toEqual(["bookmarks"]);
    expect(providedServices.bookmarks.versions["1.0.0"]).toBe("provideBookmarks");
    expect(typeof bookmarks.provideBookmarks).toBe("function");
    expect(bookmarks.provideBookmarks()).toBe(provider);
  });

  it("reaches a consumer through the service hub", () => {
    let consumed;
    const subscription = lumine.packages.serviceHub.consume(
      "bookmarks",
      "^1.0.0",
      (service) => (consumed = service),
    );

    try {
      expect(consumed).toBe(provider);
    } finally {
      subscription.dispose();
    }
  });

  it("reports an editor's bookmarks as live markers", () => {
    expect(provider.getBookmarksForEditor(editor)).toEqual([]);

    editor.setCursorBufferPosition([3, 4]);
    lumine.commands.dispatch(editorElement, "bookmarks:toggle-bookmark");

    const markers = provider.getBookmarksForEditor(editor);
    expect(markers.length).toBe(1);
    expect(markers[0].getBufferRange()).toEqual([
      [3, 4],
      [3, 4],
    ]);
  });

  it("returns null, not undefined, for an editor it never attached to", () => {
    // A mini editor is not a pane item, so `observeTextEditors` never sees it.
    // This is the only case the contract's `null` describes.
    const mini = lumine.workspace.buildTextEditor({ mini: true });

    try {
      expect(provider.getInstanceForEditor(mini)).toBeNull();
      expect(provider.getBookmarksForEditor(mini)).toBeNull();
    } finally {
      mini.destroy();
    }
  });

  it("attaches exactly one instance to an editor opened after a deactivate cycle", async () => {
    const state = bookmarks.serialize();
    bookmarks.deactivate();
    bookmarks.activate(state);

    const reopened = await lumine.workspace.open("sample.coffee");
    const reopenedElement = lumine.views.getView(reopened);

    // A discarded observer subscription left a second instance over a second
    // marker layer, and the lookup answered with the stale, empty one.
    expect(bookmarks.editorsBookmarks.filter((b) => b.editor === reopened).length).toBe(1);

    reopened.setCursorBufferPosition([1, 0]);
    lumine.commands.dispatch(reopenedElement, "bookmarks:toggle-bookmark");
    expect(provider.getBookmarksForEditor(reopened).length).toBe(1);
  });
});
