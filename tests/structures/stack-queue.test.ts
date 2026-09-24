import { describe, it, expect } from "vitest";
import { Stack, Queue } from "../../packages/structures/src/index.js";

describe("Stack (undo history for check-ins, FR-11)", () => {
  it("starts empty", () => {
    const s = new Stack<number>();
    expect(s.isEmpty()).toBe(true);
    expect(s.size()).toBe(0);
  });

  it("pushes and pops in LIFO order", () => {
    const s = new Stack<string>();
    s.push("check-in-1");
    s.push("check-in-2");
    s.push("check-in-3");
    expect(s.pop()).toBe("check-in-3");
    expect(s.pop()).toBe("check-in-2");
    expect(s.size()).toBe(1);
  });

  it("peek returns the top without removing it", () => {
    const s = new Stack<number>();
    s.push(1);
    s.push(2);
    expect(s.peek()).toBe(2);
    expect(s.size()).toBe(2);
  });

  it("pop on empty stack throws", () => {
    const s = new Stack<number>();
    expect(() => s.pop()).toThrow();
  });

  it("peek on empty stack throws", () => {
    const s = new Stack<number>();
    expect(() => s.peek()).toThrow();
  });
});

describe("Queue (GPS ingestion buffer, FR-14)", () => {
  it("starts empty", () => {
    const q = new Queue<number>();
    expect(q.isEmpty()).toBe(true);
    expect(q.size()).toBe(0);
  });

  it("enqueues and dequeues in FIFO order", () => {
    const q = new Queue<string>();
    q.enqueue("point-1");
    q.enqueue("point-2");
    q.enqueue("point-3");
    expect(q.dequeue()).toBe("point-1");
    expect(q.dequeue()).toBe("point-2");
    expect(q.size()).toBe(1);
  });

  it("front returns the head without removing it", () => {
    const q = new Queue<number>();
    q.enqueue(10);
    q.enqueue(20);
    expect(q.front()).toBe(10);
    expect(q.size()).toBe(2);
  });

  it("dequeue on empty queue throws", () => {
    const q = new Queue<number>();
    expect(() => q.dequeue()).toThrow();
  });

  it("front on empty queue throws", () => {
    const q = new Queue<number>();
    expect(() => q.front()).toThrow();
  });

  it("handles interleaved enqueue/dequeue without losing order", () => {
    const q = new Queue<number>();
    q.enqueue(1);
    q.enqueue(2);
    expect(q.dequeue()).toBe(1);
    q.enqueue(3);
    expect(q.dequeue()).toBe(2);
    expect(q.dequeue()).toBe(3);
    expect(q.isEmpty()).toBe(true);
  });
});
