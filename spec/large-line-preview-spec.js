const { TextBuffer } = require("lumine");

describe("bounded bookmark previews", () => {
  it("shows a bounded, marked excerpt around the bookmarked column", () => {
    const buffer = new TextBuffer({ text: "x".repeat(100000) + "TARGET" + "y".repeat(100000) });
    const marker = buffer.markPosition([0, 100000]);
    try {
      spyOn(buffer, "lineForRow").and.throwError("whole bookmark line");
      const text = require("../lib/line-preview")(
        { getBuffer: () => buffer },
        { getStartBufferPosition: () => marker.getStartPosition() },
      );
      expect(text.length).toBeLessThanOrEqual(1028);
      expect(text).toContain("TARGET");
      expect(text.startsWith("…")).toBeTrue();
      expect(text.endsWith("…")).toBeTrue();
    } finally {
      marker.destroy();
      buffer.destroy();
    }
  });

  it("keeps ordinary short lines intact and does not split surrogate pairs", () => {
    const buffer = new TextBuffer({ text: "  short line  \n" + "😀".repeat(3000) });
    const first = buffer.markPosition([0, 3]);
    const second = buffer.markPosition([1, 1001]);
    const preview = require("../lib/line-preview");
    try {
      expect(
        preview(
          { getBuffer: () => buffer },
          { getStartBufferPosition: () => first.getStartPosition() },
        ),
      ).toBe("short line");
      const text = preview(
        { getBuffer: () => buffer },
        { getStartBufferPosition: () => second.getStartPosition() },
      );
      expect(text.startsWith("…😀")).toBeTrue();
      expect(text.endsWith("😀…")).toBeTrue();
    } finally {
      first.destroy();
      second.destroy();
      buffer.destroy();
    }
  });
});
