describe("bookmarks pickers in editor windows", () => {
  beforeEach(async () => {
    jasmine.useRealClock();
    jasmine.attachToDOM(lumine.workspace.getElement());
    await lumine.packages.activatePackage("bookmarks");
  });
  afterEach(async () => {
    await lumine.packages.deactivatePackage("bookmarks");
    await lumine.workspace.discardEditorWindows();
  });
  it("keeps simultaneous queries in independent native hosts", async () => {
    const workspace = lumine.workspace;
    const first = await workspace.open();
    const extra = await workspace.openEditorWindow({ show: false });
    const second = workspace.buildTextEditor();
    extra.getEditorContainer().getActivePane().activateItem(second, { activatePane: true });
    await lumine.commands.dispatch(first.getElement(), "bookmarks:view-all");
    await lumine.commands.dispatch(second.getElement(), "bookmarks:view-all");
    const local = workspace
      .getMainWindow()
      .getElement()
      .querySelector(".bookmarks-view lumine-input-dialog")
      .getModel();
    const remote = extra
      .getElement()
      .querySelector(".bookmarks-view lumine-input-dialog")
      .getModel();
    expect(remote.getElement().ownerDocument).toBe(extra.getDocument());
    await local.setQuery("local");
    await remote.setQuery("remote");
    expect(local.getQuery()).toBe("local");
    expect(remote.getQuery()).toBe("remote");
  });
});
