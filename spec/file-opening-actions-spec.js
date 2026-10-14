const path = require("path");
const { CompositeDisposable } = require("lumine");

describe("bookmarks file opening actions", () => {
  let view, editor, layer, window, pane, leases, external;
  const filename = path.join(__dirname, "fixtures", "sample.js");

  beforeEach(async () => {
    jasmine.useRealClock();
    jasmine.attachToDOM(lumine.workspace.getElement());
    await lumine.packages.activatePackage("bookmarks");
    external = (await lumine.packages.activatePackage("open-external")).mainModule;
    editor = await lumine.workspace.open(filename, { opener: "text-editor" });
    layer = editor.addMarkerLayer();
    layer.markBufferRange([
      [1, 0],
      [1, 1],
    ]);
    window = lumine.workspace.getMainWindow();
    pane = lumine.workspace.getActivePane().splitRight();
    pane.activate();
    const BookmarksView = require("../lib/bookmarks-view");
    view = new BookmarksView([{ editor, markerLayer: layer }], window);
    leases = new CompositeDisposable();
    await view.show();
  });

  afterEach(async () => {
    leases.dispose();
    await view.selectListHost.destroy();
    layer.destroy();
  });

  async function click(modifiers) {
    const done = new Promise((resolve) => {
      const lease = view.selectList.onDidFinishAction((result) => {
        lease.dispose();
        resolve(result);
      });
    });
    view.selectList
      .getElement()
      .querySelector('[role="option"]')
      .dispatchEvent(
        new MouseEvent("click", {
          bubbles: true,
          cancelable: true,
          button: 0,
          ...modifiers,
        }),
      );
    return done;
  }

  it("passes the bookmarked position and captured pane to Open With on Alt-click", async () => {
    await lumine.packages.deactivatePackage("open-with");
    const choose = jasmine.createSpy("choose opener");
    leases.add(
      lumine.commands.add("lumine-workspace", {
        "open-with:toggle": (event) => {
          event.stopPropagation();
          choose(event.detail);
        },
      }),
    );
    expect((await click({ altKey: true })).status).toBe("success");
    expect(choose).toHaveBeenCalledOnceWith({
      path: filename,
      initialLine: 1,
      initialColumn: 0,
      pane,
    });
  });

  it("forces a pending text editor on Shift-click when automatic previews are disabled", async () => {
    lumine.config.set("core.allowPendingPaneItems", false);
    expect((await click({ shiftKey: true })).status).toBe("success");
    const opened = pane.getActiveItem();
    expect(opened.getPath()).toBe(filename);
    expect(opened).not.toBe(editor);
    expect(opened.getCursorBufferPosition()).toEqual([1, 0]);
    expect(pane.getPendingItem()).toBe(opened);
  });

  it("routes the system gestures through the registered external handlers", async () => {
    const open = spyOn(external, "openExternal").and.resolveTo("");
    const show = spyOn(external, "showInFolder").and.resolveTo("");
    expect((await click({ ctrlKey: true, altKey: true })).status).toBe("success");
    await view.show();
    expect((await click({ ctrlKey: true, shiftKey: true })).status).toBe("success");
    expect(open).toHaveBeenCalledOnceWith(filename);
    expect(show).toHaveBeenCalledOnceWith(filename);
  });

  it("keeps an unsaved bookmark's primary navigation and makes file alternatives unavailable", async () => {
    await view.selectListHost.destroy();
    const unsaved = await lumine.workspace.open();
    unsaved.setText("first\nsecond\n");
    const markers = unsaved.addMarkerLayer();
    markers.markBufferRange([
      [1, 0],
      [1, 1],
    ]);
    const BookmarksView = require("../lib/bookmarks-view");
    view = new BookmarksView([{ editor: unsaved, markerLayer: markers }], window);
    await view.show();
    expect((await view.selectList.runAction("bookmarks:open-selected-pending")).status).toBe(
      "unavailable",
    );
    expect((await view.selectList.confirmSelection()).status).toBe("success");
    expect(unsaved.getSelectedBufferRange()).toEqual([
      [1, 0],
      [1, 1],
    ]);
    markers.destroy();
  });

  it("resolves the shared alternatives in the query editor", () => {
    for (const [keystrokes, command] of [
      ["alt-enter", "bookmarks:open-selected-with"],
      ["shift-enter", "bookmarks:open-selected-pending"],
      ["ctrl-alt-enter", "bookmarks:open-selected-external"],
      ["ctrl-shift-enter", "bookmarks:show-selected-in-folder"],
    ])
      expect(
        lumine.keymaps.findKeyBindings({
          target: view.selectList.getQueryEditor().getElement(),
          keystrokes,
        })[0]?.command,
      ).toBe(command);
  });
});
