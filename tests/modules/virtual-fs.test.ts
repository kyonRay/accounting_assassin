import { describe, it, expect, beforeEach } from "vitest";
import { createVirtualFs, type VirtualFs } from "@/modules/Sandbox/virtual-fs";

describe("VirtualFs", () => {
  let fs: VirtualFs;
  beforeEach(() => { fs = createVirtualFs(); });

  it("write then read returns same content", async () => {
    await fs.write("hello.txt", "world");
    expect(await fs.read("hello.txt")).toBe("world");
  });

  it("exists returns true/false correctly", async () => {
    await fs.write("a.txt", "x");
    expect(await fs.exists("a.txt")).toBe(true);
    expect(await fs.exists("b.txt")).toBe(false);
  });

  it("list returns all paths", async () => {
    await fs.write("invoices/01.csv", "");
    await fs.write("notes.md", "");
    const all = await fs.list();
    expect(all.sort()).toEqual(["invoices/01.csv", "notes.md"]);
  });

  it("reset clears all files", async () => {
    await fs.write("a.txt", "x");
    await fs.reset();
    expect(await fs.exists("a.txt")).toBe(false);
  });

  it("loadFixture seeds multiple files", async () => {
    await fs.loadFixture({
      "data/x.csv": "col\n1\n",
      "scripts/y.py": "print('hi')",
    });
    expect(await fs.read("data/x.csv")).toBe("col\n1\n");
  });
});
