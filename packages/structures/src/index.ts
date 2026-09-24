interface StackNode<T> {
  value: T;
  next: StackNode<T> | null;
}

/**
 * Stack (LIFO) for walk check-in undo history (FR-11).
 *
 * Backing store: singly linked nodes anchored at the top.
 *
 * Big-O:
 * - push: O(1)
 * - pop: O(1)
 * - peek: O(1)
 * - size: O(1)
 * - isEmpty: O(1)
 */
export class Stack<T> {
  private topNode: StackNode<T> | null = null;
  private count = 0;

  size(): number {
    return this.count;
  }

  isEmpty(): boolean {
    return this.count === 0;
  }

  push(value: T): void {
    this.topNode = { value, next: this.topNode };
    this.count += 1;
  }

  pop(): T {
    if (this.topNode === null) {
      throw new Error("Cannot pop from an empty stack.");
    }
    const value = this.topNode.value;
    this.topNode = this.topNode.next;
    this.count -= 1;
    return value;
  }

  peek(): T {
    if (this.topNode === null) {
      throw new Error("Cannot peek an empty stack.");
    }
    return this.topNode.value;
  }
}

interface QueueNode<T> {
  value: T;
  next: QueueNode<T> | null;
}

/**
 * Queue (FIFO) for GPS ingestion buffer before persistence (FR-14).
 *
 * Backing store: singly linked nodes with head and tail pointers.
 *
 * Big-O:
 * - enqueue: O(1)
 * - dequeue: O(1)
 * - front: O(1)
 * - size: O(1)
 * - isEmpty: O(1)
 */
export class Queue<T> {
  private head: QueueNode<T> | null = null;
  private tail: QueueNode<T> | null = null;
  private count = 0;

  size(): number {
    return this.count;
  }

  isEmpty(): boolean {
    return this.count === 0;
  }

  enqueue(value: T): void {
    const node: QueueNode<T> = { value, next: null };
    if (this.tail === null) {
      this.head = node;
      this.tail = node;
    } else {
      this.tail.next = node;
      this.tail = node;
    }
    this.count += 1;
  }

  dequeue(): T {
    if (this.head === null) {
      throw new Error("Cannot dequeue from an empty queue.");
    }
    const value = this.head.value;
    this.head = this.head.next;
    if (this.head === null) {
      this.tail = null;
    }
    this.count -= 1;
    return value;
  }

  front(): T {
    if (this.head === null) {
      throw new Error("Cannot read front of an empty queue.");
    }
    return this.head.value;
  }
}
