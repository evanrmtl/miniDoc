import { LeafNode } from './LeafNode.service';
import { LseqIdentifier } from '../CRDT/LseqIdentifier.service';

describe('LeafNode', () => {
    let leafNode: LeafNode;

    beforeEach(() => {
        leafNode = new LeafNode();
    });

    describe('Constructor', () => {
        it('should create empty LeafNode with default constructor', () => {
            expect(leafNode).toBeTruthy();
            expect(leafNode.ids.length).toBe(0);
            expect(leafNode.MAX_LENGTH).toBe(256);
        });

        it('should create LeafNode with provided ids', () => {
            const ids = [
                new LseqIdentifier([1], 'client-a'),
                new LseqIdentifier([2], 'client-b')
            ];
            const node = new LeafNode(ids);
            
            expect(node.ids.length).toBe(2);
            expect(node.ids[0]).toEqual(ids[0]);
            expect(node.ids[1]).toEqual(ids[1]);
        });

        it('should create a copy of the provided ids array', () => {
            const originalIds = [new LseqIdentifier([1], 'client-a')];
            const node = new LeafNode(originalIds);
            
            originalIds.push(new LseqIdentifier([2], 'client-b'));
            
            expect(node.ids.length).toBe(1);
        });
    });

    describe('length getter', () => {
        it('should return 0 for empty node', () => {
            expect(leafNode.length).toBe(0);
        });

        it('should return correct length for populated node', () => {
            leafNode.ids.push(new LseqIdentifier([1], 'client'));
            leafNode.ids.push(new LseqIdentifier([2], 'client'));
            
            expect(leafNode.length).toBe(2);
        });
    });

    describe('findOrderedInsertIndex', () => {
        beforeEach(() => {
            // Setup: [1], [3], [5]
            leafNode.ids.push(new LseqIdentifier([1], 'client'));
            leafNode.ids.push(new LseqIdentifier([3], 'client'));
            leafNode.ids.push(new LseqIdentifier([5], 'client'));
        });

        it('should return 0 for insertion at beginning', () => {
            const newId = new LseqIdentifier([0], 'client');
            const index = leafNode.findOrderedInsertIndex(newId);
            expect(index).toBe(0);
        });

        it('should return correct index for insertion in middle', () => {
            const newId = new LseqIdentifier([2], 'client');
            const index = leafNode.findOrderedInsertIndex(newId);
            expect(index).toBe(1);
        });

        it('should return length for insertion at end', () => {
            const newId = new LseqIdentifier([6], 'client');
            const index = leafNode.findOrderedInsertIndex(newId);
            expect(index).toBe(3);
        });

        it('should handle duplicate values by client comparison', () => {
            const newId = new LseqIdentifier([3], 'client-a'); 
            const index = leafNode.findOrderedInsertIndex(newId);
            expect(index).toBe(2); 
        });
    });

    describe('insertIdOrdered', () => {
        it('should insert in correct order', () => {
            const id1 = new LseqIdentifier([3], 'client');
            const id2 = new LseqIdentifier([1], 'client');
            const id3 = new LseqIdentifier([2], 'client');

            leafNode.insertIdOrdered(id1);
            leafNode.insertIdOrdered(id2);
            leafNode.insertIdOrdered(id3);

            expect(leafNode.ids.length).toBe(3);
            expect(leafNode.ids[0].path[0]).toBe(1);
            expect(leafNode.ids[1].path[0]).toBe(2);
            expect(leafNode.ids[2].path[0]).toBe(3);
        });

        it('should maintain order with complex paths', () => {
            const id1 = new LseqIdentifier([1, 5], 'client');
            const id2 = new LseqIdentifier([1], 'client');
            const id3 = new LseqIdentifier([1, 3], 'client');

            leafNode.insertIdOrdered(id1);
            leafNode.insertIdOrdered(id2);
            leafNode.insertIdOrdered(id3);

            // Order should be: [1] < [1,3] < [1,5]
            expect(leafNode.ids[0]).toEqual(id2);
            expect(leafNode.ids[1]).toEqual(id3);
            expect(leafNode.ids[2]).toEqual(id1);
        });
    });

    describe('split', () => {
        it('should split even number of elements correctly', () => {
            for (let i = 1; i <= 4; i++) {
                leafNode.ids.push(new LseqIdentifier([i], 'client'));
            }

            const { leftLeaf, rightLeaf } = leafNode.split();

            expect(leftLeaf.length).toBe(2);
            expect(rightLeaf.length).toBe(2);
            expect(leftLeaf.ids[0].path[0]).toBe(1);
            expect(leftLeaf.ids[1].path[0]).toBe(2);
            expect(rightLeaf.ids[0].path[0]).toBe(3);
            expect(rightLeaf.ids[1].path[0]).toBe(4);
        });

        it('should split odd number of elements correctly', () => {
            for (let i = 1; i <= 5; i++) {
                leafNode.ids.push(new LseqIdentifier([i], 'client'));
            }

            const { leftLeaf, rightLeaf } = leafNode.split();

            expect(leftLeaf.length).toBe(2);
            expect(rightLeaf.length).toBe(3);
        });

        it('should handle single element split', () => {
            leafNode.ids.push(new LseqIdentifier([1], 'client'));

            const { leftLeaf, rightLeaf } = leafNode.split();

            expect(leftLeaf.length).toBe(0);
            expect(rightLeaf.length).toBe(1);
            expect(rightLeaf.ids[0].path[0]).toBe(1);
        });

        it('should create independent leaf nodes', () => {
            leafNode.ids.push(new LseqIdentifier([1], 'client'));
            leafNode.ids.push(new LseqIdentifier([2], 'client'));

            const { leftLeaf, rightLeaf } = leafNode.split();

            leftLeaf.ids.push(new LseqIdentifier([99], 'client'));

            expect(rightLeaf.length).toBe(1);
            expect(leafNode.length).toBe(2);
        });
    });

    describe('insertIdAt', () => {
        beforeEach(() => {
            leafNode.ids.push(new LseqIdentifier([1], 'client'));
            leafNode.ids.push(new LseqIdentifier([3], 'client'));
        });

        it('should insert at specified position', () => {
            const newId = new LseqIdentifier([2], 'client');
            leafNode.insertIdAt(1, newId);

            expect(leafNode.length).toBe(3);
            expect(leafNode.ids[1]).toEqual(newId);
        });

        it('should clamp position to valid range - negative', () => {
            const newId = new LseqIdentifier([0], 'client');
            leafNode.insertIdAt(-5, newId);

            expect(leafNode.ids[0]).toEqual(newId);
            expect(leafNode.length).toBe(3);
        });

        it('should clamp position to valid range - too large', () => {
            const newId = new LseqIdentifier([4], 'client');
            leafNode.insertIdAt(999, newId);

            expect(leafNode.ids[leafNode.length - 1]).toEqual(newId);
            expect(leafNode.length).toBe(3);
        });

        it('should insert at beginning when position is 0', () => {
            const newId = new LseqIdentifier([0], 'client');
            leafNode.insertIdAt(0, newId);

            expect(leafNode.ids[0]).toEqual(newId);
            expect(leafNode.length).toBe(3);
        });
    });

    describe('addId', () => {
        it('should add id successfully when under capacity', () => {
            const result = leafNode.addId([1, 2, 3], 'client-test');

            expect(result).toBe(true);
            expect(leafNode.length).toBe(1);
            expect(leafNode.ids[0].path).toEqual([1, 2, 3]);
            expect(leafNode.ids[0].clientId).toBe('client-test');
        });

        it('should reject addition when at max capacity', () => {
            for (let i = 0; i < 256; i++) {
                leafNode.addId([i], 'client');
            }

            const result = leafNode.addId([999], 'client');

            expect(result).toBe(false);
            expect(leafNode.length).toBe(256);
        });

        it('should add multiple ids correctly', () => {
            leafNode.addId([1], 'client-a');
            leafNode.addId([2], 'client-b');
            leafNode.addId([3], 'client-c');

            expect(leafNode.length).toBe(3);
            expect(leafNode.ids[0].clientId).toBe('client-a');
            expect(leafNode.ids[1].clientId).toBe('client-b');
            expect(leafNode.ids[2].clientId).toBe('client-c');
        });
    });

    describe('getIdAtOffset', () => {
        beforeEach(() => {
            leafNode.ids.push(new LseqIdentifier([10], 'client-a'));
            leafNode.ids.push(new LseqIdentifier([20], 'client-b'));
            leafNode.ids.push(new LseqIdentifier([30], 'client-c'));
        });

        it('should return correct id at valid offset', () => {
            const id = leafNode.getIdAtOffset(1);
            expect(id).toBeTruthy();
            expect(id!.path[0]).toBe(20);
            expect(id!.clientId).toBe('client-b');
        });

        it('should return null for negative offset', () => {
            const id = leafNode.getIdAtOffset(-1);
            expect(id).toBeNull();
        });

        it('should return null for offset beyond array bounds', () => {
            const id = leafNode.getIdAtOffset(999);
            expect(id).toBeNull();
        });

        it('should return null for empty node', () => {
            const emptyNode = new LeafNode();
            const id = emptyNode.getIdAtOffset(0);
            expect(id).toBeNull();
        });

        it('should return first and last elements correctly', () => {
            const first = leafNode.getIdAtOffset(0);
            const last = leafNode.getIdAtOffset(2);

            expect(first!.path[0]).toBe(10);
            expect(last!.path[0]).toBe(30);
        });
    });

    describe('Edge cases and stress tests', () => {
        it('should handle capacity boundary correctly', () => {
            for (let i = 0; i < 255; i++) {
                expect(leafNode.addId([i], 'client')).toBe(true);
            }

            expect(leafNode.addId([255], 'client')).toBe(true);
            expect(leafNode.length).toBe(256);

            expect(leafNode.addId([256], 'client')).toBe(false);
        });

        describe('Real-world usage scenarios', () => {
            it('should initialize with sentinels correctly', () => {
                leafNode.addId([0], 'sentinel-start');
                leafNode.addId([1000000], 'sentinel-end');
                
                expect(leafNode.length).toBe(2);
                expect(leafNode.ids[0].path[0]).toBe(0);
                expect(leafNode.ids[1].path[0]).toBe(1000000);
            });

            it('should insert LSEQ identifiers in correct order', () => {
                leafNode.addId([0], 'sentinel-start');
                leafNode.addId([1000000], 'sentinel-end');
                
                leafNode.insertIdOrdered(new LseqIdentifier([500], 'client'));
                leafNode.insertIdOrdered(new LseqIdentifier([250], 'client'));
                leafNode.insertIdOrdered(new LseqIdentifier([750], 'client'));
                
                expect(leafNode.ids[0].path[0]).toBe(0);
                expect(leafNode.ids[1].path[0]).toBe(250);
                expect(leafNode.ids[2].path[0]).toBe(500);
                expect(leafNode.ids[3].path[0]).toBe(750);
                expect(leafNode.ids[4].path[0]).toBe(1000000);
            });
        });
    });
});
