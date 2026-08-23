# bookmarks

Reads the bookmarks set in an editor, as live markers.

|             |                                                      |
| ----------- | ---------------------------------------------------- |
| Version     | `1.0.0`                                              |
| Provided by | `provideBookmarks()` returning the provider instance |
| Consumed by | `consumeBookmarks(service)`                          |
| Owner       | `bookmarks`                                          |

**No package consumes this today.** It exists so a scrollbar overview, a minimap layer, or a navigation panel can show where the bookmarks are.

## Registration

In your `package.json`:

```json
{
  "consumedServices": {
    "bookmarks": {
      "versions": { "^1.0.0": "consumeBookmarks" }
    }
  }
}
```

## Contract

```ts
type Bookmarks = {
  getBookmarksForEditor(editor: TextEditor): DisplayMarker[] | null;
  getInstanceForEditor(editor: TextEditor): BookmarksForEditor | null;
};

type BookmarksForEditor = {
  getAllBookmarks(): DisplayMarker[];
  onDidChangeBookmarks(callback: (bookmarks: DisplayMarker[]) => void): Disposable;
};
```

| Member                          | Description                                                                                                                               |
| ------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| `getBookmarksForEditor(editor)` | Every bookmark in that editor as a `DisplayMarker`, `[]` when there are none, or `null` when the editor has no bookmarks instance at all. |
| `getInstanceForEditor(editor)`  | The object holding that editor's bookmarks, or `null` on the same terms. Its two guaranteed members are in the block above.               |

## Minimal example

```js
const { Disposable } = require("lumine");

module.exports = {
  consumeBookmarks(service) {
    this.bookmarks = service;
    return new Disposable(() => (this.bookmarks = null));
  },

  rowsFor(editor) {
    const markers = this.bookmarks?.getBookmarksForEditor(editor) ?? [];
    return markers.map((marker) => marker.getStartScreenPosition().row);
  },
};
```

## Behavior

`null` and `[]` mean different things. `[]` is an editor that is tracked and has no bookmarks; `null` is an editor `bookmarks` has not attached to, which means a mini editor: those are not pane items, and `observeTextEditors` visits every pane item the workspace already holds as well as every later one. Treat both as "nothing to draw" unless you need the distinction.

A bookmark is a `DisplayMarker` that tracks a buffer range, so it moves with edits and you should read positions when you need them rather than caching rows.

**One bookmark can span several rows**, so there is no one-to-one relationship between markers and the gutter icons the user sees.

Change notification is per editor, through `getInstanceForEditor(editor).onDidChangeBookmarks(callback)`. It fires once per change with the editor's remaining bookmarks — once per command however many cursors it acted on, and once for an edit that invalidates several at a time. It says nothing about a bookmark whose range merely moved, so read positions when you need them rather than caching rows. Re-query when the set of editors changes; the service itself has no notification for that.

## Teardown

Return a `Disposable` that drops your reference. The markers belong to the `bookmarks` package; do not destroy them.

## Versioning

`1.0.0` provided, `^1.0.0` consumed. A change that breaks this shape gets a new service name rather than a new major version, and both sides move in the same release.
