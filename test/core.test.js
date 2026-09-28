import { test } from 'node:test';
import assert from 'node:assert/strict';
import { LaggedFibonacci } from '../src/index.js';

test('constructor uses default j=24, k=55, seed=1', () => {
  const g = new LaggedFibonacci();
  const a = g.next();
  const b = g.next();
  assert.equal(typeof a, 'number');
  assert.equal(typeof b, 'number');
  assert.notEqual(a, b);
});

test('next returns integers in [0, 2^31 - 1]', () => {
  const g = new LaggedFibonacci({ seed: 42 });
  for (let i = 0; i < 1000; i++) {
    const v = g.next();
    assert.equal(Number.isInteger(v), true);
    assert.ok(v >= 0, `value ${v} below 0`);
    assert.ok(v <= 2147483647, `value ${v} above 2^31-1`);
  }
});

test('same seed produces the same sequence', () => {
  const g1 = new LaggedFibonacci({ seed: 123 });
  const g2 = new LaggedFibonacci({ seed: 123 });
  for (let i = 0; i < 100; i++) {
    assert.equal(g1.next(), g2.next());
  }
});

test('different seeds produce different sequences', () => {
  const g1 = new LaggedFibonacci({ seed: 1 });
  const g2 = new LaggedFibonacci({ seed: 2 });
  let diff = false;
  for (let i = 0; i < 100; i++) {
    if (g1.next() !== g2.next()) { diff = true; break; }
  }
  assert.equal(diff, true);
});

test('nextFloat returns values in [0, 1)', () => {
  const g = new LaggedFibonacci({ seed: 7 });
  for (let i = 0; i < 1000; i++) {
    const f = g.nextFloat();
    assert.ok(f >= 0, `float ${f} below 0`);
    assert.ok(f < 1, `float ${f} at or above 1`);
  }
});

test('custom j and k work', () => {
  const g = new LaggedFibonacci({ j: 7, k: 10, seed: 5 });
  const first = g.next();
  assert.equal(typeof first, 'number');
  assert.ok(first >= 0 && first <= 2147483647);
});

test('j must be positive', () => {
  assert.throws(() => new LaggedFibonacci({ j: 0, k: 5 }), RangeError);
});

test('k must be greater than j', () => {
  assert.throws(() => new LaggedFibonacci({ j: 5, k: 5 }), RangeError);
  assert.throws(() => new LaggedFibonacci({ j: 6, k: 5 }), RangeError);
});

test('j and k must be integers', () => {
  assert.throws(() => new LaggedFibonacci({ j: 1.5, k: 5 }), TypeError);
  assert.throws(() => new LaggedFibonacci({ j: 1, k: 5.5 }), TypeError);
});

test('seed must be a non-negative integer', () => {
  assert.throws(() => new LaggedFibonacci({ seed: -1 }), RangeError);
  assert.throws(() => new LaggedFibonacci({ seed: 1.5 }), TypeError);
});

test('zero seed is allowed and produces a non-degenerate sequence', () => {
  const g = new LaggedFibonacci({ seed: 0 });
  const vals = new Set();
  for (let i = 0; i < 100; i++) vals.add(g.next());
  assert.ok(vals.size > 1, 'sequence was degenerate');
});

test('clone produces an independent generator with the same state', () => {
  const g = new LaggedFibonacci({ seed: 99 });
  g.next();
  g.next();
  const c = g.clone();
  for (let i = 0; i < 50; i++) {
    assert.equal(g.next(), c.next());
  }
});

test('large seed value is accepted', () => {
  const g = new LaggedFibonacci({ seed: 9007199254740991 });
  const v = g.next();
  assert.ok(v >= 0 && v <= 2147483647);
});
