import { describe, expect, it } from 'vitest';
import { calculateOrder, loads } from '@/lib/marketplace';

describe('Mock package calculations', () => {
  it('computes weight and amount from package count', () => {
    expect(calculateOrder({ weight: 10, price: 48000 }, 20)).toEqual({ weight: 200, total: 9600000 });
    expect(calculateOrder({ weight: 12, price: 42000 }, 16)).toEqual({ weight: 192, total: 8064000 });
  });
  it('has valid bounds and all four quality grades', () => {
    expect(new Set(loads.map(load => load.quality)).size).toBe(4);
    loads.forEach(load => { expect(load.minimum).toBeGreaterThan(0); expect(load.stock).toBeGreaterThanOrEqual(load.minimum); });
  });
});