const path = require("node:path");
const fs = require("node:fs/promises");

describe("Bookmarks command availability", () => {
  let editor, fragment, view;
  beforeEach(async () => {
    jasmine.attachToDOM(lumine.workspace.getElement());
    await lumine.packages.activatePackage("bookmarks");
    editor = await lumine.workspace.open();
  });
  afterEach(async () => {
    view?.destroy();
    fragment?.destroy();
    editor.destroy();
    await lumine.packages.deactivatePackage("bookmarks");
    view = fragment = null;
  });
  it("does not advertise an unobserved non-pane editor", () => {
    fragment = lumine.workspace.buildTextEditor();
    lumine.workspace.getElement().appendChild(fragment.element);
    expect(lumine.commands.canDispatch(fragment.element, "bookmarks:toggle-bookmark")).toBe(false);
    expect(lumine.commands.canDispatch(editor.element, "bookmarks:toggle-bookmark")).toBe(true);
  });
  it("describes a saved bookmark without reading the filesystem", () => {
    const View = require("../lib/bookmarks-view");
    view = new View([]);
    const filePath = path.resolve(__dirname, "fixtures", "missing-review-file.txt");
    spyOn(editor, "getPath").and.returnValue(filePath);
    const marker = editor.markBufferRange([
      [0, 0],
      [0, 0],
    ]);
    spyOn(fs, "stat").and.rejectWith(new Error("must not read during presentation"));
    expect(view.fileTarget({ editor, marker }).path).toBe(filePath);
    expect(fs.stat).not.toHaveBeenCalled();
    marker.destroy();
  });
  it("does not open a bookmark whose editor disappears during file validation", async () => {
    const View = require("../lib/bookmarks-view");
    view = new View([]);
    spyOn(editor, "getPath").and.returnValue(__filename);
    const marker = editor.markBufferRange([
      [0, 0],
      [0, 0],
    ]);
    let finish;
    spyOn(fs, "stat").and.returnValue(
      new Promise((resolve) => {
        finish = resolve;
      }),
    );
    spyOn(lumine.workspace, "open").and.resolveTo();
    const running = view.performFileAction({ editor, marker }, "external");
    editor.destroy();
    finish({ isFile: () => true });
    await running;
    expect(lumine.workspace.open).not.toHaveBeenCalled();
  });
  it("declines the primary action for a stale bookmarked editor", async () => {
    const View = require("../lib/bookmarks-view");
    view = new View([]);
    const marker = editor.markBufferRange([
      [0, 0],
      [0, 0],
    ]);
    await view.selectList.setItems([{ editor, marker }]);
    editor.destroy();
    expect((await view.selectList.getActionAvailability("bookmarks:open-bookmark")).status).toBe(
      "disabled",
    );
  });
});
