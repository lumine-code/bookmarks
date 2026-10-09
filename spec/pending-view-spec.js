describe("Bookmarks pending browser display", () => {
  let main, view;

  beforeEach(async () => {
    jasmine.attachToDOM(lumine.views.getView(lumine.workspace));
    const editor = await lumine.workspace.open();
    editor.setText("a bookmark\nanother line\n");
    main = (await lumine.packages.activatePackage("bookmarks")).mainModule;
    main.bookmarksByEditor.get(editor).toggleBookmark();
    await lumine.commands.dispatch(lumine.workspace.getElement(), "bookmarks:view-all");
    view = main.bookmarksView;
    view.hide();
  });

  it("does not show a destroyed browser when pending item publication finishes", async () => {
    let release;
    const gate = new Promise((resolve) => (release = resolve));
    const publish = view.selectList.setItems.bind(view.selectList);
    let published = false;
    spyOn(view.selectList, "setItems").and.callFake(async (items) => {
      await publish(items);
      published = true;
      await gate;
    });
    const show = spyOn(view.selectListHost, "show").and.callThrough();
    const showing = view.show();
    await conditionPromise(() => published, "bookmark items published");
    await lumine.packages.deactivatePackage("bookmarks");
    const current = await lumine.packages.activatePackage("bookmarks");
    expect(current.mainModule.bookmarksView).toBeNull();

    release();
    await expectAsync(showing).toBeResolved();

    expect(show).not.toHaveBeenCalled();
    expect(current.mainModule.bookmarksView).toBeNull();
  });
});
