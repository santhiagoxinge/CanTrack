import { describe, it, expect } from "vitest";
import { AvlTree } from "../../packages/structures/src/index.js";

// Dogs/stops are indexed by next-pickup time so the walker's next stop is
// findable in O(log n) (FR-08). Keys here are epoch-ms pickup times.
describe("AvlTree (next pickup by time, FR-08)", () => {
  it("starts empty and min() throws", () => {
    const t = new AvlTree<number, string>();
    expect(t.size()).toBe(0);
    expect(() => t.min()).toThrow();
  });

  it("insert then min() returns the earliest pickup", () => {
    const t = new AvlTree<number, string>();
    t.insert(300, "dog-c");
    t.insert(100, "dog-a");
    t.insert(200, "dog-b");
    expect(t.min()).toEqual({ key: 100, value: "dog-a" });
  });

  it("stays height-balanced after ascending inserts (the AVL guarantee)", () => {
    const t = new AvlTree<number, string>();
    // Ascending insert order is what breaks an unbalanced BST into a
    // degenerate O(n) chain; AVL must keep height ~log2(n).
    for (let i = 0; i < 100; i++) {
      t.insert(i, `dog-${i}`);
    }
    expect(t.size()).toBe(100);
    // log2(100) ~= 6.6; a correct AVL tree's height stays close to that,
    // nowhere near the 100 a plain BST chain would reach.
    expect(t.height()).toBeLessThanOrEqual(10);
  });

  it("find returns the value for an exact key", () => {
    const t = new AvlTree<number, string>();
    t.insert(150, "dog-x");
    expect(t.find(150)).toBe("dog-x");
    expect(t.find(999)).toBeUndefined();
  });

  it("remove deletes a key and rebalances", () => {
    const t = new AvlTree<number, string>();
    [50, 30, 70, 20, 40, 60, 80].forEach((k) => t.insert(k, `dog-${k}`));
    t.remove(30);
    expect(t.find(30)).toBeUndefined();
    expect(t.size()).toBe(6);
    expect(t.min()).toEqual({ key: 20, value: "dog-20" });
  });

  it("in-order traversal returns keys sorted ascending", () => {
    const t = new AvlTree<number, string>();
    [50, 10, 90, 30, 70].forEach((k) => t.insert(k, `v${k}`));
    expect(t.inorderKeys()).toEqual([10, 30, 50, 70, 90]);
  });
});
