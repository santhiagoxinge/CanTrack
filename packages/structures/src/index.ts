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

interface DoublyLinkedListNode<T> {
  value: T;
  previous: DoublyLinkedListNode<T> | null;
  next: DoublyLinkedListNode<T> | null;
}

/**
 * Doubly linked list for walk timeline events (FR-12).
 *
 * Big-O:
 * - append: O(1)
 * - prepend: O(1)
 * - removeAt: O(n)
 * - size: O(1)
 * - toArray: O(n)
 * - toArrayReverse: O(n)
 */
export class DoublyLinkedList<T> {
  private head: DoublyLinkedListNode<T> | null = null;
  private tail: DoublyLinkedListNode<T> | null = null;
  private count = 0;

  size(): number {
    return this.count;
  }

  append(value: T): void {
    const node: DoublyLinkedListNode<T> = {
      value,
      previous: this.tail,
      next: null,
    };
    if (this.tail === null) {
      this.head = node;
    } else {
      this.tail.next = node;
    }
    this.tail = node;
    this.count += 1;
  }

  prepend(value: T): void {
    const node: DoublyLinkedListNode<T> = {
      value,
      previous: null,
      next: this.head,
    };
    if (this.head === null) {
      this.tail = node;
    } else {
      this.head.previous = node;
    }
    this.head = node;
    this.count += 1;
  }

  removeAt(index: number): void {
    if (!Number.isInteger(index) || index < 0 || index >= this.count) {
      throw new RangeError("Removal index is out of range.");
    }

    let current = this.head;
    for (let position = 0; position < index; position += 1) {
      current = current!.next;
    }

    if (current!.previous === null) {
      this.head = current!.next;
      if (this.head === null) {
        this.tail = null;
      } else {
        this.head.previous = null;
      }
    } else {
      current!.previous.next = current!.next;
      if (current!.next === null) {
        this.tail = current!.previous;
      } else {
        current!.next.previous = current!.previous;
      }
    }
    this.count -= 1;
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

  toArrayReverse(): T[] {
    const values: T[] = [];
    let current = this.tail;
    while (current !== null) {
      values.push(current.value);
      current = current.previous;
    }
    return values;
  }
}

interface CircularListNode<T> {
  value: T;
  next: CircularListNode<T> | null;
}

/**
 * Circular list for recurring route rotation (FR-13).
 *
 * Backing store: singly linked nodes with a first, tail, and current pointer.
 *
 * Big-O:
 * - add: O(1)
 * - current: O(1)
 * - next: O(1)
 * - size: O(1)
 */
export class CircularList<T> {
  private head: CircularListNode<T> | null = null;
  private tail: CircularListNode<T> | null = null;
  private currentNode: CircularListNode<T> | null = null;
  private count = 0;

  size(): number {
    return this.count;
  }

  add(value: T): void {
    const node: CircularListNode<T> = { value, next: null };
    if (this.tail === null) {
      node.next = node;
      this.head = node;
      this.tail = node;
      this.currentNode = node;
    } else {
      this.tail.next = node;
      node.next = this.head;
      this.tail = node;
    }
    this.count += 1;
  }

  current(): T {
    if (this.currentNode === null) {
      throw new Error("Cannot read the current item of an empty circular list.");
    }
    return this.currentNode.value;
  }

  next(): T {
    if (this.currentNode === null) {
      throw new Error("Cannot advance an empty circular list.");
    }
    const nextNode = this.currentNode.next;
    if (nextNode === null) {
      throw new Error("Cannot advance a circular list without a next item.");
    }
    this.currentNode = nextNode;
    return nextNode.value;
  }
}

interface AvlNode<K extends number | string, V> {
  key: K;
  value: V;
  left: AvlNode<K, V> | null;
  right: AvlNode<K, V> | null;
  height: number;
}

function avlNodeHeight<K extends number | string, V>(node: AvlNode<K, V> | null): number {
  return node === null ? 0 : node.height;
}

function avlUpdateHeight<K extends number | string, V>(node: AvlNode<K, V>): void {
  node.height = 1 + Math.max(avlNodeHeight(node.left), avlNodeHeight(node.right));
}

function avlBalanceFactor<K extends number | string, V>(node: AvlNode<K, V>): number {
  return avlNodeHeight(node.left) - avlNodeHeight(node.right);
}

function avlRotateRight<K extends number | string, V>(node: AvlNode<K, V>): AvlNode<K, V> {
  const newRoot = node.left!;
  node.left = newRoot.right;
  newRoot.right = node;
  avlUpdateHeight(node);
  avlUpdateHeight(newRoot);
  return newRoot;
}

function avlRotateLeft<K extends number | string, V>(node: AvlNode<K, V>): AvlNode<K, V> {
  const newRoot = node.right!;
  node.right = newRoot.left;
  newRoot.left = node;
  avlUpdateHeight(node);
  avlUpdateHeight(newRoot);
  return newRoot;
}

function avlRebalance<K extends number | string, V>(node: AvlNode<K, V>): AvlNode<K, V> {
  avlUpdateHeight(node);
  const balance = avlBalanceFactor(node);

  if (balance > 1) {
    if (avlBalanceFactor(node.left!) < 0) {
      node.left = avlRotateLeft(node.left!);
    }
    return avlRotateRight(node);
  }

  if (balance < -1) {
    if (avlBalanceFactor(node.right!) > 0) {
      node.right = avlRotateRight(node.right!);
    }
    return avlRotateLeft(node);
  }

  return node;
}

/**
 * AVL tree for finding the earliest scheduled pickup by key (FR-08).
 *
 * Big-O:
 * - insert: O(log n)
 * - remove: O(log n)
 * - find: O(log n)
 * - min: O(log n)
 * - height: O(1)
 * - size: O(1)
 * - inorderKeys: O(n)
 */
export class AvlTree<K extends number | string, V> {
  private root: AvlNode<K, V> | null = null;
  private count = 0;

  size(): number {
    return this.count;
  }

  height(): number {
    return avlNodeHeight(this.root);
  }

  insert(key: K, value: V): void {
    let inserted = false;

    const insertNode = (node: AvlNode<K, V> | null): AvlNode<K, V> => {
      if (node === null) {
        inserted = true;
        return { key, value, left: null, right: null, height: 1 };
      }

      if (key < node.key) {
        node.left = insertNode(node.left);
      } else if (key > node.key) {
        node.right = insertNode(node.right);
      } else {
        node.value = value;
      }

      return avlRebalance(node);
    };

    this.root = insertNode(this.root);
    if (inserted) {
      this.count += 1;
    }
  }

  find(key: K): V | undefined {
    let current = this.root;
    while (current !== null) {
      if (key < current.key) {
        current = current.left;
      } else if (key > current.key) {
        current = current.right;
      } else {
        return current.value;
      }
    }
    return undefined;
  }

  min(): { key: K; value: V } {
    let current = this.root;
    if (current === null) {
      throw new Error("Cannot read the minimum of an empty tree.");
    }

    while (current.left !== null) {
      current = current.left;
    }
    return { key: current.key, value: current.value };
  }

  remove(key: K): void {
    let removed = false;

    const removeNode = (
      node: AvlNode<K, V> | null,
      targetKey: K,
    ): AvlNode<K, V> | null => {
      if (node === null) {
        return null;
      }

      if (targetKey < node.key) {
        node.left = removeNode(node.left, targetKey);
      } else if (targetKey > node.key) {
        node.right = removeNode(node.right, targetKey);
      } else {
        removed = true;
        if (node.left === null) {
          return node.right;
        }
        if (node.right === null) {
          return node.left;
        }

        let successor = node.right;
        while (successor.left !== null) {
          successor = successor.left;
        }
        node.key = successor.key;
        node.value = successor.value;
        node.right = removeNode(node.right, successor.key);
      }

      return avlRebalance(node);
    };

    this.root = removeNode(this.root, key);
    if (removed) {
      this.count -= 1;
    }
  }

  inorderKeys(): K[] {
    const keys: K[] = [];
    const collect = (node: AvlNode<K, V> | null): void => {
      if (node === null) {
        return;
      }
      collect(node.left);
      keys.push(node.key);
      collect(node.right);
    };

    collect(this.root);
    return keys;
  }
}

interface WeightedGraphEdge<T> {
  to: T;
  weight: number;
}

/**
 * Weighted graph for pickup routing (FR-09).
 *
 * Backing store: adjacency list keyed by node.
 *
 * Big-O:
 * - addNode: O(1) average
 * - addEdge: O(1) average
 * - shortestPath: O(V^2 + E)
 */
export class WeightedGraph<T = string> {
  private adjacency = new Map<T, WeightedGraphEdge<T>[]>();

  addNode(node: T): void {
    if (!this.adjacency.has(node)) {
      this.adjacency.set(node, []);
    }
  }

  addEdge(from: T, to: T, weight: number): void {
    if (!Number.isFinite(weight) || weight < 0) {
      throw new RangeError("Edge weight must be a finite non-negative number.");
    }

    this.addNode(from);
    this.addNode(to);
    this.adjacency.get(from)!.push({ to, weight });
  }

  shortestPath(start: T, target: T): { distance: number; path: T[] } {
    if (!this.adjacency.has(start) || !this.adjacency.has(target)) {
      throw new Error("Cannot find a path between unknown nodes.");
    }

    const distances = new Map<T, number>();
    const previous = new Map<T, T>();
    const unvisited = new Set(this.adjacency.keys());
    distances.set(start, 0);

    while (unvisited.size > 0) {
      let current: { node: T; distance: number } | undefined;
      for (const node of unvisited) {
        const distance = distances.get(node);
        if (distance === undefined) {
          continue;
        }
        if (current === undefined || distance < current.distance) {
          current = { node, distance };
        }
      }

      if (current === undefined) {
        break;
      }

      unvisited.delete(current.node);
      if (current.node === target) {
        const path: T[] = [target];
        let cursor = target;
        while (cursor !== start) {
          const predecessor = previous.get(cursor);
          if (predecessor === undefined) {
            throw new Error("Cannot reconstruct the shortest path.");
          }
          cursor = predecessor;
          path.push(cursor);
        }
        path.reverse();
        return { distance: current.distance, path };
      }

      for (const edge of this.adjacency.get(current.node)!) {
        if (!unvisited.has(edge.to)) {
          continue;
        }

        const candidateDistance = current.distance + edge.weight;
        const knownDistance = distances.get(edge.to);
        if (knownDistance === undefined || candidateDistance < knownDistance) {
          distances.set(edge.to, candidateDistance);
          previous.set(edge.to, current.node);
        }
      }
    }

    throw new Error("No path exists between the requested nodes.");
  }
}
