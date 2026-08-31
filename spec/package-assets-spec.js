const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const read = (rel) => fs.readFileSync(path.join(root, rel), "utf8");
const manifest = require("../package.json");
const menus = JSON.parse(read("menus/main.json"));

const submenuNamed = (items, label) => items.find((item) => item.label === label);
const groupsOf = (items) =>
  items
    .reduce(
      (groups, item) =>
        item.type === "separator"
          ? [...groups, []]
          : [...groups.slice(0, -1), [...groups[groups.length - 1], item]],
      [[]],
    )
    .filter((group) => group.length > 0);

const COMMANDS = [
  "bookmarks:view-all",
  "bookmarks:toggle-bookmark",
  "bookmarks:clear-bookmarks",
  "bookmarks:jump-to-next-bookmark",
  "bookmarks:jump-to-previous-bookmark",
  "bookmarks:select-to-next-bookmark",
  "bookmarks:select-to-previous-bookmark",
];

describe("bookmarks package assets", () => {
  it("names every command in the menu", () => {
    const flat = JSON.stringify(menus.menu);
    for (const command of COMMANDS) {
      expect(flat).toContain(`"${command}"`);
    }
  });

  // A package adds to a core menu, it does not restructure one, and a package
  // with more than one command owns a submenu under Packages.
  it("adds one leaf to Edit and keeps the full surface under Packages", () => {
    const edit = submenuNamed(menus.menu, "Edit");
    expect(edit.submenu.length).toBe(1);
    expect(edit.submenu[0].command).toBe("bookmarks:toggle-bookmark");
    expect(edit.submenu[0].submenu).toBeUndefined();

    const bookmarks = submenuNamed(submenuNamed(menus.menu, "Packages").submenu, "Bookmarks");
    const items = bookmarks.submenu;
    expect(items.filter((item) => item.type !== "separator").length).toBe(COMMANDS.length);
    expect(items[0].type).not.toBe("separator");
    expect(items[items.length - 1].type).not.toBe("separator");

    // Seven commands is past the six that may stay flat.
    const groups = groupsOf(items);
    expect(groups.length).toBe(3);
    for (const group of groups) {
      expect(group.length).toBeGreaterThan(1);
    }
  });

  it("fences the context-menu block with separators at both ends", () => {
    const block = menus["context-menu"]["lumine-text-editor:not([mini])"];
    expect(block[0].type).toBe("separator");
    expect(block[block.length - 1].type).toBe("separator");
  });

  // Core renders one .icon-right per line number and uses it as the fold
  // indicator, matching the click target on class rather than on glyph.
  it("anchors the mark to the gutter edge and aligns it with the line number", () => {
    const styles = read("styles/main.css");
    // Comments stripped: the block above the rule explains why .icon-right is
    // the thing being avoided, and naming it there is the point.
    const rules = styles.replace(/\/\*[\s\S]*?\*\//g, "");

    expect(rules).not.toContain(".icon-right");
    expect(rules).toContain("var(--bookmarks-marker-color");
    // Absolute left fixes the horizontal position independently of the number's
    // digit count. With no top inset, the inline static position supplies the
    // vertical baseline without contributing any layout width.
    expect(rules).toMatch(/padding-left:\s*1\.1em;/);
    expect(rules).toMatch(/position:\s*absolute;/);
    expect(rules).toMatch(/left:\s*0\.3em;/);
    expect(rules).toMatch(/width:\s*0\.5em;/);
    expect(rules).toMatch(/vertical-align:\s*baseline;/);
    expect(rules).not.toMatch(/\btop\s*:/);
  });

  it("keeps the manifest pointed at lumine-code", () => {
    expect(manifest.name).toBe("bookmarks");
    expect(manifest.author).toBe("lumine-code");
    expect(manifest.repository).toBe("https://github.com/lumine-code/bookmarks");
    expect(manifest.bugs.url).toBe("https://github.com/lumine-code/bookmarks/issues");
    expect(manifest.scripts.test).toBe("lumine --test spec");
    // The editor runs a bundled package's suite out of node_modules, so a
    // package that withheld spec would drop out of CI reporting success.
    expect(manifest.files).toContain("spec");
  });

  it("uses the one canonical description sentence everywhere it appears", () => {
    const readme = read("README.md").split(/\r?\n/);
    expect(readme[0]).toBe("# bookmarks");
    expect(readme[2]).toBe(manifest.description);
  });
});
