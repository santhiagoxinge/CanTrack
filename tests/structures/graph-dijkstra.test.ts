import { describe, it, expect } from "vitest";
import { WeightedGraph } from "../../packages/structures/src/index.js";

// The street mesh for pickup routing under time windows (FR-09).
describe("WeightedGraph + Dijkstra (pickup routing, FR-09)", () => {
  it("shortestPath on a single edge returns that edge", () => {
    const g = new WeightedGraph();
    g.addEdge("home", "dog-a", 5);
    const result = g.shortestPath("home", "dog-a");
    expect(result.distance).toBe(5);
    expect(result.path).toEqual(["home", "dog-a"]);
  });

  it("picks the shorter of two paths, not the one with fewer hops", () => {
    const g = new WeightedGraph();
    g.addEdge("home", "b", 10);
    g.addEdge("home", "c", 1);
    g.addEdge("c", "b", 1);
    const result = g.shortestPath("home", "b");
    expect(result.distance).toBe(2);
    expect(result.path).toEqual(["home", "c", "b"]);
  });

  it("throws when there is no path between the nodes", () => {
    const g = new WeightedGraph();
    g.addEdge("home", "dog-a", 5);
    g.addNode("island");
    expect(() => g.shortestPath("home", "island")).toThrow();
  });

  it("shortestPath from a node to itself is zero", () => {
    const g = new WeightedGraph();
    g.addEdge("home", "dog-a", 5);
    const result = g.shortestPath("home", "home");
    expect(result.distance).toBe(0);
    expect(result.path).toEqual(["home"]);
  });

  it("handles a multi-stop route across several dogs", () => {
    const g = new WeightedGraph();
    g.addEdge("home", "dog-a", 4);
    g.addEdge("dog-a", "dog-b", 3);
    g.addEdge("home", "dog-b", 9);
    g.addEdge("dog-b", "dog-c", 2);
    const result = g.shortestPath("home", "dog-c");
    expect(result.distance).toBe(9);
    expect(result.path).toEqual(["home", "dog-a", "dog-b", "dog-c"]);
  });

  it("throws for an unknown source or target node", () => {
    const g = new WeightedGraph();
    g.addEdge("home", "dog-a", 5);
    expect(() => g.shortestPath("nowhere", "dog-a")).toThrow();
  });
});
