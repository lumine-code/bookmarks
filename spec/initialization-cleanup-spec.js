describe("Bookmarks initialization cleanup", () => {
  it("unloads a recovery bootstrap before editor observers have activated", async () => {
    const pack = lumine.packages.loadPackage("bookmarks");
    pack.requireMainModule();
    pack.initializeForExternalUse("document restoration");
    expect(pack.mainInitialized).toBe(true);
    expect(pack.mainActivated).toBe(false);

    await lumine.packages.unloadPackage("bookmarks", { serialize: false });

    expect(lumine.packages.isPackageLoaded("bookmarks")).toBe(false);
  });
});
