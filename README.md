# bookmarks

Mark lines in the editor and jump back to them.

## Features

- **Line bookmarks**: toggle a bookmark on any line and see it highlighted in the gutter.
- **Quick navigation**: jump to the next or previous bookmark in the editor.
- **Range selection**: select the text between the cursor and the surrounding bookmarks.
- **Bookmark browser**: view all bookmarks across open editors and jump straight to one.

## Installation

To install `bookmarks` search for it in the Install pane of the Lumine settings, or run the command `lumine --install lumine-code/bookmarks`.

## Commands

Commands available in `lumine-workspace`:

- `bookmarks:view-all`: view all bookmarks in a searchable list,
- `bookmarks:toggle-bookmark`: add or remove a bookmark on the current line,
- `bookmarks:clear-bookmarks`: remove all bookmarks in the editor,
- `bookmarks:jump-to-next-bookmark`: select the next bookmark,
- `bookmarks:jump-to-previous-bookmark`: select the previous bookmark,
- `bookmarks:select-to-next-bookmark`: extend the selection to the next bookmark,
- `bookmarks:select-to-previous-bookmark`: extend the selection to the previous bookmark.

## Customization

The colour of the mark in the gutter is a custom property. Set it in your `styles.css`:

```css
lumine-text-editor {
  --bookmarks-marker-color: #e5c07b;
}
```

A bookmarked line carries the `bookmarked` class on three decorations, so a bookmark can be styled wherever it shows. `.line-number.bookmarked` is the gutter row, `.line.bookmarked` the line itself, and `.highlight.bookmarked` the bookmarked text — the last only when the bookmark covers a range rather than a single point.

```css
lumine-text-editor .line.bookmarked {
  background-color: rgba(229, 192, 123, 0.08);
}
```

## Services

- [`bookmarks`](docs/bookmarks.md): provided to expose the list of bookmarks to any package that wants to know about them.

## Contributing

Got ideas to make this package better, found a bug, or want to help add new features? Just drop your thoughts on GitHub. Any feedback is welcome!
