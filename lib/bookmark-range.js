// Buffer ranges exclude an end at column zero on the following row.
module.exports = function lastCoveredRow(range) {
  return range.end.row - (!range.isEmpty() && range.end.column === 0 ? 1 : 0);
};
