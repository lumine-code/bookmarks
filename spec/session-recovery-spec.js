const path = require("node:path");

describe("Bookmarks session recovery", () => {
  for (const isUnloading of [false, true]) {
    it(`preserves bookmark layers through repeated ${isUnloading ? "shutdown" : "autosave"} recovery`, async () => {
      const pack = await lumine.packages.activatePackage("bookmarks");
      jasmine.attachToDOM(lumine.views.getView(lumine.workspace));
      const filePath = path.join(__dirname, "fixtures", "sample.js");
      let editor = await lumine.workspace.open(filePath);
      editor.setText("first\nsecond\nthird\n");
      editor.setCursorBufferPosition([1, 0]);
      lumine.commands.dispatch(lumine.views.getView(editor), "bookmarks:toggle-bookmark");
      const provider = pack.mainModule.provideBookmarks();
      expect(provider.getBookmarksForEditor(editor).length).toBe(1);

      for (let cycle = 0; cycle < 3; cycle++) {
        const snapshot = JSON.parse(JSON.stringify(await lumine.captureState({ isUnloading })));
        const layerId = snapshot.documentStates.bookmarks[editor.id].markerLayerId;
        const buffer = snapshot.project.buffers.find((state) => state.id === editor.getBuffer().id);
        expect(buffer.markerLayers[layerId]).toBeDefined();
        await lumine.deserialize(snapshot);
        editor = lumine.workspace
          .getTextEditors()
          .find((candidate) => candidate.getPath() === filePath);
        const markers = provider.getBookmarksForEditor(editor);
        expect(markers.length).toBe(1);
        expect(markers[0]?.getStartBufferPosition().row).toBe(1);
      }
    });
  }
});
