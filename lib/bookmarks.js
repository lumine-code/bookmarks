const { CompositeDisposable, Emitter } = require("lumine");

module.exports = class Bookmarks {
  static deserialize(editor, state) {
    return new Bookmarks(editor, editor.getMarkerLayer(state.markerLayerId));
  }

  constructor(editor, markerLayer) {
    this.emitter = new Emitter();
    this.editor = editor;
    this.sweeping = false;
    this.markerLayer = markerLayer || this.editor.addMarkerLayer({ persistent: true });
    this.decorationLayer = this.editor.decorateMarkerLayer(this.markerLayer, {
      type: "line-number",
      class: "bookmarked",
    });
    this.disposables = new CompositeDisposable();
    this.decorationLayerLine = this.editor.decorateMarkerLayer(this.markerLayer, {
      type: "line",
      class: "bookmarked",
    });
    this.decorationLayerHighlight = this.editor.decorateMarkerLayer(this.markerLayer, {
      type: "highlight",
      class: "bookmarked",
    });
    this.disposables.add(
      this.editor.onDidDestroy(this.destroy.bind(this)),
      this.markerLayer.onDidUpdate(this.sweepInvalidBookmarks.bind(this)),
    );

    // A layer restored from a previous session can already carry bookmarks the
    // buffer invalidated back then: `valid` rides the serialization along with
    // the range, and nothing ever sets it back to true. No further update event
    // is guaranteed before the user next toggles that row, so sweep once now.
    this.sweepInvalidBookmarks();
  }

  // Destroy every bookmark the buffer has invalidated, and say so once.
  //
  // At the layer rather than at each marker, which is what core recommends and
  // what makes this cover bookmarks restored from a previous session — they
  // arrive through `deserialize` with no per-marker subscription attached, and
  // an invalid marker nothing destroys is one the gutter stops drawing while
  // every count, the picker and the service still report it.
  //
  // The guard is load-bearing. Destroying a marker ends in
  // `MarkerLayer#destroyMarker` -> `delegate.markersUpdated`, which re-emits
  // `did-update` synchronously and re-enters here once per destroyed marker;
  // without it the sweep recurses and emits one event per bookmark instead of
  // one per change.
  sweepInvalidBookmarks() {
    if (this.sweeping || this.markerLayer.getMarkerCount() === 0) return;

    this.sweeping = true;
    try {
      const invalidated = this.markerLayer.findMarkers({ valid: false });
      for (const bookmark of invalidated) {
        bookmark.destroy();
      }
      if (invalidated.length > 0) {
        this.emitter.emit("did-change-bookmarks", this.getAllBookmarks());
      }
    } finally {
      this.sweeping = false;
    }
  }

  destroy() {
    this.deactivate();
    this.markerLayer.destroy();
  }

  deactivate() {
    this.decorationLayer.destroy();
    this.decorationLayerLine.destroy();
    this.decorationLayerHighlight.destroy();
    this.disposables.dispose();
  }

  serialize() {
    return { markerLayerId: this.markerLayer.id };
  }

  toggleBookmark() {
    for (const range of this.editor.getSelectedBufferRanges()) {
      const bookmarks = this.markerLayer.findMarkers({
        intersectsRowRange: [range.start.row, range.end.row],
      });
      if (bookmarks && bookmarks.length > 0) {
        for (const bookmark of bookmarks) {
          bookmark.destroy();
        }
      } else {
        this.markerLayer.markBufferRange(range, {
          invalidate: "surround",
          exclusive: true,
        });
      }
      this.emitter.emit("did-change-bookmarks", this.getAllBookmarks());
    }
  }

  getAllBookmarks() {
    let markers = this.markerLayer.getMarkers();
    return markers;
  }

  onDidChangeBookmarks(callback) {
    return this.emitter.on("did-change-bookmarks", callback);
  }

  clearBookmarks() {
    for (const bookmark of this.markerLayer.getMarkers()) {
      bookmark.destroy();
    }
    this.emitter.emit("did-change-bookmarks", []);
  }

  jumpToNextBookmark() {
    if (this.markerLayer.getMarkerCount() > 0) {
      const bufferRow = this.editor.getLastCursor().getMarker().getStartBufferPosition().row;
      const markers = this.markerLayer.getMarkers().sort((a, b) => a.compare(b));
      const bookmarkMarker =
        markers.find((marker) => marker.getBufferRange().start.row > bufferRow) || markers[0];
      this.editor.setSelectedBufferRange(bookmarkMarker.getBufferRange(), { autoscroll: false });
      this.editor.scrollToCursorPosition();
    } else {
      lumine.notifications.beep();
    }
  }

  jumpToPreviousBookmark() {
    if (this.markerLayer.getMarkerCount() > 0) {
      const bufferRow = this.editor.getLastCursor().getMarker().getStartBufferPosition().row;
      const markers = this.markerLayer.getMarkers().sort((a, b) => b.compare(a));
      const bookmarkMarker =
        markers.find((marker) => marker.getBufferRange().start.row < bufferRow) || markers[0];
      this.editor.setSelectedBufferRange(bookmarkMarker.getBufferRange(), { autoscroll: false });
      this.editor.scrollToCursorPosition();
    } else {
      lumine.notifications.beep();
    }
  }

  selectToNextBookmark() {
    if (this.markerLayer.getMarkerCount() > 0) {
      const bufferRow = this.editor.getLastCursor().getMarker().getStartBufferPosition().row;
      const markers = this.markerLayer.getMarkers().sort((a, b) => a.compare(b));
      const bookmarkMarker =
        markers.find((marker) => marker.getBufferRange().start.row > bufferRow) || markers[0];
      if (!bookmarkMarker) {
        lumine.notifications.beep();
      } else {
        this.editor.setSelectedBufferRange(
          [bookmarkMarker.getHeadBufferPosition(), this.editor.getCursorBufferPosition()],
          { autoscroll: false },
        );
      }
    } else {
      lumine.notifications.beep();
    }
  }

  selectToPreviousBookmark() {
    if (this.markerLayer.getMarkerCount() > 0) {
      const bufferRow = this.editor.getLastCursor().getMarker().getStartBufferPosition().row;
      const markers = this.markerLayer.getMarkers().sort((a, b) => b.compare(a));
      const bookmarkMarker =
        markers.find((marker) => marker.getBufferRange().start.row < bufferRow) || markers[0];
      if (!bookmarkMarker) {
        lumine.notifications.beep();
      } else {
        this.editor.setSelectedBufferRange(
          [this.editor.getCursorBufferPosition(), bookmarkMarker.getHeadBufferPosition()],
          { autoscroll: false },
        );
      }
    } else {
      lumine.notifications.beep();
    }
  }
};
