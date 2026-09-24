import { describe, it, expect } from "vitest";
import { SinglyLinkedList } from "../../packages/structures/src/index.js";

// A route is an ordered sequence of stops (FR-06). The walker can reorder or
// remove a stop before the route starts (FR-07).
describe("SinglyLinkedList (route stops, FR-06/FR-07)", () => {
  it("starts empty", () => {
    const l = new SinglyLinkedList<string>();
    expect(l.size()).toBe(0);
    expect(l.toArray()).toEqual([]);
  });

  it("appends stops in order", () => {
    const l = new SinglyLinkedList<string>();
    l.append("dog-a");
    l.append("dog-b");
    l.append("dog-c");
    expect(l.toArray()).toEqual(["dog-a", "dog-b", "dog-c"]);
    expect(l.size()).toBe(3);
  });

  it("inserts a stop at a given index", () => {
    const l = new SinglyLinkedList<string>();
    l.append("dog-a");
    l.append("dog-c");
    l.insertAt(1, "dog-b");
    expect(l.toArray()).toEqual(["dog-a", "dog-b", "dog-c"]);
  });

  it("removes a stop at a given index", () => {
    const l = new SinglyLinkedList<string>();
    l.append("dog-a");
    l.append("dog-b");
    l.append("dog-c");
    l.removeAt(1);
    expect(l.toArray()).toEqual(["dog-a", "dog-c"]);
  });

  it("removeAt on an out-of-range index throws", () => {
    const l = new SinglyLinkedList<string>();
    l.append("dog-a");
    expect(() => l.removeAt(5)).toThrow();
    expect(() => l.removeAt(-1)).toThrow();
  });

  it("insertAt on an out-of-range index throws", () => {
    const l = new SinglyLinkedList<string>();
    l.append("dog-a");
    expect(() => l.insertAt(5, "dog-x")).toThrow();
  });

  it("get returns the value at an index", () => {
    const l = new SinglyLinkedList<number>();
    l.append(10);
    l.append(20);
    expect(l.get(1)).toBe(20);
  });
});
