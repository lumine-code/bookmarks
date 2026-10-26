module.exports = function linePreview(editor, marker) {
  const { row, column } = marker.getStartBufferPosition();
  const buffer = editor.getBuffer();
  const length = buffer.lineLengthForRow(row);
  if (!Number.isFinite(length)) return "";
  let from = Math.max(0, Math.min(length, column) - 128);
  let to = Math.min(length, from + 1024);
  const source = buffer.getTextSnapshot();
  const start = buffer.characterIndexForPosition([row, 0]);
  const high = (code) => code >= 0xd800 && code <= 0xdbff;
  const low = (code) => code >= 0xdc00 && code <= 0xdfff;
  if (from > 0 && low(source.charCodeAt(start + from)) && high(source.charCodeAt(start + from - 1)))
    from--;
  if (to < length && high(source.charCodeAt(start + to - 1)) && low(source.charCodeAt(start + to)))
    to++;
  return (
    (from > 0 ? "…" : "") + source.slice(start + from, start + to).trim() + (to < length ? "…" : "")
  );
};
