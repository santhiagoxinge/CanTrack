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

interface SinglyLinkedListNode<T> {
  value: T;
  next: SinglyLinkedListNode<T> | null;
}

/**
 * Singly linked list for ordered route stops (FR-06 and FR-07).
 *
 * Big-O:
 * - append: O(1)
 * - insertAt: O(n)
 * - removeAt: O(n)
 * - get: O(n)
 * - size: O(1)
 * - toArray: O(n)
 */
export class SinglyLinkedList<T> {
  private head: SinglyLinkedListNode<T> | null = null;
  private tail: SinglyLinkedListNode<T> | null = null;
  private count = 0;

  size(): number {
    return this.count;
  }

  append(value: T): void {
    const node: SinglyLinkedListNode<T> = { value, next: null };
    if (this.tail === null) {
      this.head = node;
    } else {
      this.tail.next = node;
    }
    this.tail = node;
    this.count += 1;
  }

  insertAt(index: number, value: T): void {
    if (!Number.isInteger(index) || index < 0 || index > this.count) {
      throw new RangeError("Insertion index is out of range.");
    }

    const node: SinglyLinkedListNode<T> = { value, next: null };
    if (index === 0) {
      node.next = this.head;
      this.head = node;
      if (this.tail === null) {
        this.tail = node;
      }
      this.count += 1;
      return;
    }

    let previous = this.head;
    for (let position = 0; position < index - 1; position += 1) {
      previous = previous!.next;
    }
    node.next = previous!.next;
    previous!.next = node;
    if (index === this.count) {
      this.tail = node;
    }
    this.count += 1;
  }

  removeAt(index: number): void {
    if (!Number.isInteger(index) || index < 0 || index >= this.count) {
      throw new RangeError("Removal index is out of range.");
    }

    if (index === 0) {
      this.head = this.head!.next;
      this.count -= 1;
      if (this.head === null) {
        this.tail = null;
      }
      return;
    }

    let previous = this.head;
    for (let position = 0; position < index - 1; position += 1) {
      previous = previous!.next;
    }
    previous!.next = previous!.next!.next;
    if (index === this.count - 1) {
      this.tail = previous;
    }
    this.count -= 1;
  }

  get(index: number): T {
    if (!Number.isInteger(index) || index < 0 || index >= this.count) {
      throw new RangeError("Access index is out of range.");
    }

    let current = this.head;
    for (let position = 0; position < index; position += 1) {
      current = current!.next;
    }
    return current!.value;
  }

  toArray(): T[] {
    const values: T[] = [];
    let current = this.head;
    while (current !== null) {
      values.push(current.value);
      current = current.next;
    }
    return values;
  }
}
