# Lagged Fibonacci Generator

A small, zero-dependency TypeScript-free ESM library that produces pseudorandom 31-bit integers using a lagged Fibonacci generator with configurable `j` and `k` lags.

```js
import { LaggedFibonacci } from './src/index.js';

const rng = new LaggedFibonacci({ j: 24, k: 55, seed: 1 });
console.log(rng.next());       // a 31-bit unsigned integer
console.log(rng.nextFloat());  // a float in [0, 1)
const copy = rng.clone();      // independent copy with the same state
```

## Why

This exists when you need a fast, deterministic, seedable PRNG with no native dependencies and a known recurrence. It uses `state[n] = (state[n-j] + state[n-k]) mod 2^32` and returns the high 31 bits. Addition is chosen over XOR for its longer period; the high bits are returned because the low bits of an additive LFG have a short period. The trade-off is statistical quality: this is not a CSPRPC and will not pass TestU01's BigCrush the way PCG or xoshiro do. Use it for simulations, procedural generation, and tests where reproducibility matters more than cryptographic strength.

## Edge cases

- `j` and `k` must be integers with `0 < j < k`; otherwise a `RangeError` or `TypeError` is thrown.
- `seed` must be a non-negative safe integer. A zero seed is allowed — the internal expander uses a non-zero constant so the state vector is non-degenerate.
- `next()` returns integers in `[0, 2^31 - 1]`, not the full 32-bit range. This is deliberate: the top bit is discarded to keep the result non-negative and the low bits are discarded by the right-shift.

## Design notes

The window stores values eagerly rather than keeping running aggregates. Running
sums drift with floating point over long streams, and recomputing from a small
buffer is cheap enough that the drift is not worth the speed.

## Performance

The window keeps a bounded buffer, so `push` is constant time and memory does not
grow with the length of the stream. `peak` and `trough` are linear in the window
size, which is the trade that keeps `push` cheap.

