/**
 * Lagged Fibonacci generator core.
 *
 * Uses the recurrence  state[n] = (state[n-j] + state[n-k]) mod 2^32, returning the
 * high 31 bits as a non-negative integer in [0, 2^31 - 1]. Addition mod 2^32 is
 * chosen over XOR because it produces a longer period (2^k - 1 when k is a
 * Mersenne exponent and the initial state is non-zero) and better statistical
 * independence between successive outputs. The high bits are returned rather
 * than the low bits because the low bits of an additive LFG have a short period;
 * this is a well-known weakness of the construction.
 */

const MASK32 = 0xffffffff;

/**
 * Validate (j, k) lag parameters.
 *
 * The recurrence requires 0 < j < k. We also require k >= 2 so that the state
 * vector has at least two distinct slots, which keeps the seeding logic simple
 * and avoids a degenerate generator.
 *
 * @param {number} j - the smaller lag
 * @param {number} k - the larger lag
 * @throws {TypeError} if j or k is not a safe integer
 * @throws {RangeError} if the ordering or magnitude constraints are violated
 */
function validateLags(j, k) {
  if (!Number.isSafeInteger(j) || !Number.isSafeInteger(k)) {
    throw new TypeError('j and k must be safe integers');
  }
  if (j <= 0) {
    throw new RangeError('j must be positive');
  }
  if (k <= j) {
    throw new RangeError('k must be greater than j');
  }
  if (k < 2) {
    throw new RangeError('k must be at least 2');
  }
}

/**
 * Validate a numeric seed.
 *
 * @param {number} seed
 * @throws {TypeError} if seed is not a safe integer
 * @throws {RangeError} if seed is negative
 */
function validateSeed(seed) {
  if (!Number.isSafeInteger(seed)) {
    throw new TypeError('seed must be a safe integer');
  }
  if (seed < 0) {
    throw new RangeError('seed must be non-negative');
  }
}

/**
 * Build the initial state vector from a single integer seed using a 64-bit xorshift
 * (splitmix-style) expansion.
 *
 * Seeding from a single value is convenient for testing and reproducibility. We
 * expand it to k words so that every state slot is non-zero for any non-zero
 * seed, which avoids the short transient that occurs when the state vector is
 * mostly zeros. The expansion is deterministic and cheap.
 *
 * @param {number} seed - non-negative integer
 * @param {number} k - state length
 * @returns {number[]} array of k 32-bit unsigned words
 */
function seedState(seed, k) {
  const state = new Array(k);
  let lo = seed & MASK32;
  // Use the seed as the low 32 bits of a 64-bit counter; the high 32 bits are a
  // non-zero constant so that a zero seed still produces a non-zero counter.
  let hi = (seed / 4294967296) & MASK32;
  if (hi === 0 && lo === 0) {
    hi = 0x9e3779b9;
  }
  for (let i = 0; i < k; i++) {
    // splitmix64 step
    lo = (lo + 1) & MASK32;
    if (lo === 0) hi = (hi + 1) & MASK32;
    let zLo = lo;
    let zHi = hi;
    // z = (z ^ (z >> 30)) * 0xbf58476d1ce4e5b9
    // shift right 30
    const sLo = (zHi << 2) | (zLo >>> 30);
    const sHi = zHi >>> 30;
    zLo ^= sLo;
    zHi ^= sHi;
    // multiply by 0xbf58476d1ce4e5b9
    const m1 = 0x1ce4e5b9;
    const m2 = 0xbf58476d;
    const pLo = Math.imul(zLo, m1);
    const pHi = Math.imul(zLo, m2) + Math.imul(zHi, m1) + ((pLo / 4294967296) | 0);
    zLo = pLo & MASK32;
    zHi = pHi & MASK32;
    // z = (z ^ (z >> 27)) * 0x94d049bb133111eb
    const s2Lo = (zHi << 5) | (zLo >>> 27);
    const s2Hi = zHi >>> 27;
    zLo ^= s2Lo;
    zHi ^= s2Hi;
    const m3 = 0x133111eb;
    const m4 = 0x94d049bb;
    const p2Lo = Math.imul(zLo, m3);
    const p2Hi = Math.imul(zLo, m4) + Math.imul(zHi, m3) + ((p2Lo / 4294967296) | 0);
    zLo = p2Lo & MASK32;
    zHi = p2Hi & MASK32;
    // z ^ (z >> 31)
    const s3Lo = (zHi << 1) | (zLo >>> 31);
    zLo ^= s3Lo;
    state[i] = zLo & MASK32;
  }
  return state;
}

export class LaggedFibonacci {
  /**
   * @param {object} [opts]
   * @param {number} [opts.j=24] - the smaller lag
   * @param {number} [opts.k=55] - the larger lag
   * @param {number} [opts.seed=1] - non-negative integer seed
   */
  constructor({ j = 24, k = 55, seed = 1 } = {}) {
    validateLags(j, k);
    validateSeed(seed);
    this._j = j;
    this._k = k;
    this._state = seedState(seed, k);
    this._index = 0;
  }

  /**
   * Advance the generator and return the next 31-bit unsigned integer.
   *
   * @returns {number} integer in [0, 2147483647]
   */
  next() {
    const j = this._j;
    const k = this._k;
    const state = this._state;
    const idx = this._index;
    const a = state[idx];
    const b = state[(idx + (k - j)) % k];
    const v = (a + b) & MASK32;
    state[idx] = v;
    this._index = (idx + 1) % k;
    return v >>> 1;
  }

  /**
   * Return a float in [0, 1) by consuming one 31-bit integer.
   *
 * @returns {number}
   */
  nextFloat() {
    return this.next() / 2147483648;
  }

  /**
   * Create an independent copy with the same parameters and state.
   *
   * @returns {LaggedFibonacci}
   */
  clone() {
    const c = new LaggedFibonacci({ j: this._j, k: this._k, seed: 1 });
    c._state = this._state.slice();
    c._index = this._index;
    return c;
  }
}
