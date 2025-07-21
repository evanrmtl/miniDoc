import { LSEQ } from './LSEQ';
import { LseqIdentifier } from './LseqIdentifier';

describe('LSEQ', () => {
    let lseq: LSEQ;

    beforeEach(() => {
        lseq = new LSEQ();
    });

    it('should insert and retrieve atoms correctly', () => {
        const id1 = new LseqIdentifier([1], 'client-id');
        const id2 = new LseqIdentifier([2], 'client-id');
        const id3 = new LseqIdentifier([3], 'client-id');
        const id4 = new LseqIdentifier([4], 'client-id');
        const id5 = new LseqIdentifier([5], 'client-id');

        const atom1 = lseq.insert(id1, 'H');
        const atom2 = lseq.insert(id2, 'e');
        const atom3 = lseq.insert(id3, 'l');
        const atom4 = lseq.insert(id4, 'l');
        const atom5 = lseq.insert(id5, 'o');
        expect(atom1.value).toBe('H');
        expect(atom2.value).toBe('e');
        expect(atom3.value).toBe('l');
        expect(atom4.value).toBe('l');
        expect(atom5.value).toBe('o');
        expect(lseq.printString()).toBe('Hello');
        expect(lseq.atoms.length).toBe(5);


        const id6 = new LseqIdentifier([1, 0], 'client-id');
        const atom6 = lseq.insert(id6, ' ');
        expect(atom6.value).toBe(' ');
        expect(lseq.printString()).toBe('H ello');


        const id7 = new LseqIdentifier([1, 0], 'client-id1');
        const atom7 = lseq.insert(id7, 'W');
        expect(atom7.value).toBe('W');
        expect(lseq.printString()).toBe('H Wello');

        const id8 = new LseqIdentifier([1, 0], 'client');
        const atom8 = lseq.insert(id8, 'r');
        expect(atom8.value).toBe('r');
        expect(lseq.printString()).toBe('Hr Wello');
    });

    it('should delete atoms correctly', () => {
        const id1 = new LseqIdentifier([1], 'client-id');
        const id2 = new LseqIdentifier([2], 'client-id');
        const id3 = new LseqIdentifier([3], 'client-id');
        const id4 = new LseqIdentifier([4], 'client-id');
        const id5 = new LseqIdentifier([5], 'client-id');

        const atom1 = lseq.insert(id1, 'H');
        const atom2 = lseq.insert(id2, 'e');
        const atom3 = lseq.insert(id3, 'l');
        const atom4 = lseq.insert(id4, 'l');
        const atom5 = lseq.insert(id5, 'o');

        lseq.delete(id3);
        expect(lseq.printString()).toBe('Helo');
        expect(lseq.atoms.length).toBe(4);

        const idUnknown = new LseqIdentifier([99], 'client-id');
        lseq.delete(idUnknown);
        expect(lseq.printString()).toBe('Helo'); // No change, as idUnknown does not exist
        expect(lseq.atoms.length).toBe(4);

        lseq.delete(id1);
        expect(lseq.printString()).toBe('elo');

        lseq.delete(id5);
        expect(lseq.printString()).toBe('el');
        expect(lseq.atoms.length).toBe(2);
    });

    it('should allocate identifiers correctly', () => {
        const id1 = lseq.alloc([1], [30]);
    
        expect(id1).toBeTruthy();
        expect(id1.path).toBeDefined();
        expect(id1.path.length).toBeGreaterThan(0);
        expect(id1.path.length).toBeLessThanOrEqual(1);;
        expect(id1.clientId).toBe('client-id');
        
        expect(id1.path[0]).toBeGreaterThan(1);
        expect(id1.path[0]).toBeLessThan(30);
        
        expect(id1.path.every(Number.isFinite)).toBe(true);

        const id = lseq.alloc();
    
        expect(id).toBeTruthy();
        expect(id.path.length).toBeGreaterThan(0);
        expect(id.path.length).toBeLessThanOrEqual(1);
        expect(id.path.every(Number.isFinite)).toBe(true);
        
        expect(id.path[0]).toBeGreaterThan(0);
        expect(id.path[0]).toBeLessThan(1000000);
    });
});
        