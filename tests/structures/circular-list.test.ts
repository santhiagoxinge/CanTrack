import { describe, it, expect } from "vitest";
import { CircularList } from "../../packages/structures/src/index.js";

// A walker's recurring routes rotate through a circular list (FR-13): after
// the last route, `next()` wraps back to the first.
describe("CircularList (recurring route rotation, FR-13)", () => {
  it("starts empty", () => {
    const c = new CircularList<string>();
    expect(c.size()).toBe(0);
  });

  it("next() on an empty list throws", () => {
    const c = new CircularList<string>();
    expect(() => c.next()).toThrow();
  });

  it("adds items and reads them in order without wrapping", () => {
    const c = new CircularList<string>();
    c.add("route-A");
    c.add("route-B");
    c.add("route-C");
    expect(c.current()).toBe("route-A");
    expect(c.next()).toBe("route-B");
    expect(c.next()).toBe("route-C");
  });

  it("wraps around to the first item after the last", () => {
    const c = new CircularList<string>();
    c.add("route-A");
    c.add("route-B");
    c.next(); // -> route-B
    expect(c.next()).toBe("route-A");
  });

  it("a single-item list wraps to itself", () => {
    const c = new CircularList<string>();
    c.add("only-route");
    expect(c.next()).toBe("only-route");
    expect(c.next()).toBe("only-route");
  });

  it("size reflects additions", () => {
    const c = new CircularList<number>();
    c.add(1);
    c.add(2);
    expect(c.size()).toBe(2);
  });
});
