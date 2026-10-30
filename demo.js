// Run from the editor checkout: node script/demo.js capture ../bookmarks
module.exports = {
  version: 1,
  dependencies: ["language-javascript"],
  viewport: { width: 1100, height: 730 },
  async prepare({ lumine, open, state, command }) {
    state.editor = await open("signal.js");
    command("bookmarks:clear-bookmarks", lumine.views.getView(state.editor));
  },
  scenes: [
    {
      id: "bookmarks",
      file: "demo.png",
      caption: "Bookmark important lines and navigate between them in the editor.",
      async run({ lumine, state, command }) {
        for (const row of [1, 5, 10, 20]) {
          state.editor.setCursorBufferPosition([row, 0]);
          command("bookmarks:toggle-bookmark", lumine.views.getView(state.editor));
        }
        state.editor.setCursorBufferPosition([5, 0]);
      },
      ready() {
        return document.querySelectorAll(".line-number.bookmarked").length === 4;
      },
    },
  ],
};
