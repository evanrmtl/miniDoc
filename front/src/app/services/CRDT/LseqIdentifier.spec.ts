import { LseqIdentifier } from './LseqIdentifier';

describe('LseqIdentifier compare method', () => {
    describe('same length paths', () => {
        it('should return negative when this path is less than other', () => {
            const id1 = new LseqIdentifier([1, 2, 3], 'client-a');
            const id2 = new LseqIdentifier([1, 2, 4], 'client-a');
            
            expect(id1.compare(id2)).toBeLessThan(0);
        });

        it('should return positive when this path is greater than other', () => {
            const id1 = new LseqIdentifier([1, 3, 2], 'client-a');
            const id2 = new LseqIdentifier([1, 2, 4], 'client-a');
            
            expect(id1.compare(id2)).toBeGreaterThan(0);
        });

        it('should return 0 when paths and clientIds are equal', () => {
            const id1 = new LseqIdentifier([1, 2, 3], 'client-a');
            const id2 = new LseqIdentifier([1, 2, 3], 'client-a');
            
            expect(id1.compare(id2)).toBe(0);
        });

        it('should return negative when path is equal and clientIds is less than other', () => {
            const id1 = new LseqIdentifier([1, 2, 3], 'client-a');
            const id2 = new LseqIdentifier([1, 2, 3], 'client-b');

            expect(id1.compare(id2)).toBeLessThan(0);
        });

        it('should return negative when path is shorter than other', () => {
            const id1 = new LseqIdentifier([1, 2, 3], 'client-a');
            const id2 = new LseqIdentifier([1, 2, 3, 4], 'client-a');

            expect(id1.compare(id2)).toBeLessThan(0);
        });

        it('should return negative when path is longer than other', () => {
            const id1 = new LseqIdentifier([1, 2, 3, 4], 'client-a');
            const id2 = new LseqIdentifier([1, 2, 3], 'client-a');

            expect(id1.compare(id2)).toBeGreaterThan(0);
        });
    });
});