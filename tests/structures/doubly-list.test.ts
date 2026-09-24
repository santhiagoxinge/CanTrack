import { describe, it, expect } from "vitest";
import { DoublyLinkedList } from "../../packages/structures/src/index.js";

// A walk's timeline (check-in, incident, check-out events) must be navigable
// forwards and backwards (FR-12).
describe("DoublyLinkedList (walk timeline, FR-12)", () => {
  it("starts empty", () => {
    const l = new DoublyLinkedList<string>();
    expect(l.size()).toBe(0);
  });

  it("appends events in order and reads them forward", () => {
    const l = new DoublyLinkedList<string>();
    l.append("check-in");
    l.append("incident: barking");
    l.append("check-out");
    expect(l.toArray()).toEqual(["check-in", "incident: barking", "check-out"]);
  });

  it("reads events backward", () => {
    const l = new DoublyLinkedList<string>();
    l.append("check-in");
    l.append("incident: barking");
    l.append("check-out");
    expect(l.toArrayReverse()).toEqual([
      "check-out",
      "incident: barking",
      "check-in",
    ]);
  });

  it("prepends an event at the front", () => {
    const l = new DoublyLinkedList<string>();
    l.append("check-out");
    l.prepend("check-in");
    expect(l.toArray()).toEqual(["check-in", "check-out"]);
  });

  it("removes an event at a given index, keeping both links consistent", () => {
    const l = new DoublyLinkedList<string>();
    l.append("a");
    l.append("b");
    l.append("c");
    l.removeAt(1);
    expect(l.toArray()).toEqual(["a", "c"]);
    expect(l.toArrayReverse()).toEqual(["c", "a"]);
  });

  it("removeAt on an out-of-range index throws", () => {
    const l = new DoublyLinkedList<string>();
    l.append("a");
    expect(() => l.removeAt(9)).toThrow();
  });
});
