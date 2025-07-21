// RopeTree.spec.ts
import { RopeTree } from './RopeTree';
import { LseqIdentifier } from '../CRDT/LseqIdentifier';
import { LeafNode } from './LeafNode';
import { InternalNode } from './InternalNode';
import { SENT_START, SENT_END } from './Sentinel';

describe('RopeTree', () => {
    let ropeTree: RopeTree;

    beforeEach(() => {
        ropeTree = new RopeTree();
    });

    describe('Constructor', () => {
        it('should initialize with sentinel nodes', () => {
            expect(ropeTree.root).toBeDefined();
            expect(ropeTree.root).toBeInstanceOf(LeafNode);
            
            const leafRoot = ropeTree.root as LeafNode;
            expect(leafRoot.length).toBe(2);
            expect(leafRoot.ids[0].path).toEqual(SENT_START.path);
            expect(leafRoot.ids[1].path).toEqual(SENT_END.path);
        });
    });

    describe('searchInTree', () => {
        it('should find position in single leaf node', () => {
            const result = ropeTree.searchInTree(ropeTree.root!, 0);
            
            expect(result).toBeTruthy();
            expect(result!.leaf).toBeInstanceOf(LeafNode);
            expect(result!.offset).toBe(0);
        });

        it('should handle position within leaf bounds', () => {
            const result = ropeTree.searchInTree(ropeTree.root!, 1);
            
            expect(result).toBeTruthy();
            expect(result!.offset).toBe(1);
        });

        it('should navigate through internal nodes', () => {
            // Create a tree structure by inserting many elements
            for (let i = 0; i < 300; i++) { // Force split
                ropeTree.insert(new LseqIdentifier([100 + i], 'client'), i + 1);
            }
            
            // Root should now be InternalNode
            expect(ropeTree.root).toBeInstanceOf(InternalNode);
            
            const result = ropeTree.searchInTree(ropeTree.root!, 50);
            expect(result).toBeTruthy();
        });

        it('should throw error for invalid node type', () => {
            const invalidNode = {} as any;
            
            expect(() => ropeTree.searchInTree(invalidNode, 0))
                .toThrowError("Invalid tree structure");
        });
    });

    describe('getInsertIds', () => {
        it('should return null for empty tree case', () => {
            const emptyTree = new RopeTree();
            emptyTree.root = null;
            
            const result = emptyTree.getInsertIds(new LeafNode(), 0);
            expect(result.p).toBeNull();
            expect(result.q).toBeNull();
        });

        it('should handle position at beginning (offset = 0)', () => {
            const result = ropeTree.getInsertIds(ropeTree.root!, 0);
            
            expect(result.p).toBeNull(); // No previous element
            expect(result.q).toBeTruthy(); // Should be sentinel start
            expect(result.q!.path).toEqual(SENT_START.path);
        });

        it('should handle position at end', () => {
            const leafRoot = ropeTree.root as LeafNode;
            const result = ropeTree.getInsertIds(ropeTree.root!, leafRoot.length);
            
            expect(result.p).toBeTruthy(); // Should be sentinel end
            expect(result.p!.path).toEqual(SENT_END.path);
            expect(result.q).toBeNull(); // No next element
        });

        it('should handle position in middle', () => {
            // Add element between sentinels
            ropeTree.insert(new LseqIdentifier([500], 'client'), 1);
            
            const result = ropeTree.getInsertIds(ropeTree.root!, 1);
            
            expect(result.p).toBeTruthy(); // Sentinel start
            expect(result.q).toBeTruthy(); // Our inserted element
            expect(result.q!.path).toEqual([500]);
        });

        it('should handle complex tree navigation', () => {
            // Insert multiple elements
            ropeTree.insert(new LseqIdentifier([100], 'client'), 1);
            ropeTree.insert(new LseqIdentifier([200], 'client'), 2);
            ropeTree.insert(new LseqIdentifier([300], 'client'), 3);
            
            const result = ropeTree.getInsertIds(ropeTree.root!, 2);
            
            expect(result.p).toBeTruthy();
            expect(result.q).toBeTruthy();
            expect(result.p!.path).toEqual([100]);
            expect(result.q!.path).toEqual([200]);
        });
    });

    describe('getDeleteIds', () => {
        it('should return null for empty search', () => {
            const emptyLeaf = new LeafNode();
            spyOn(ropeTree, 'searchInTree').and.returnValue({ leaf: emptyLeaf, offset: 0 });
            
            const result = ropeTree.getDeleteIds(ropeTree.root!, 0);
            expect(result).toBeNull();
        });

        it('should return correct ID at position', () => {
            // Insert an element
            const testId = new LseqIdentifier([500], 'client');
            ropeTree.insert(testId, 1);
            
            const result = ropeTree.getDeleteIds(ropeTree.root!, 1);
            
            expect(result).toBeTruthy();
            expect(result!.compare(testId)).toBe(0);
        });

        it('should return null when search fails', () => {
            spyOn(ropeTree, 'searchInTree').and.returnValue(null);
            
            const result = ropeTree.getDeleteIds(ropeTree.root!, 999);
            expect(result).toBeNull();
        });
    });

    describe('insert', () => {
        it('should throw error when root is null', () => {
            ropeTree.root = null;
            
            expect(() => ropeTree.insert(new LseqIdentifier([1], 'client'), 0))
                .toThrowError("Illegal state: root should always be present (initialized with sentinels)");
        });

        it('should insert into leaf node successfully', () => {
            const testId = new LseqIdentifier([500], 'client');
            const initialLength = (ropeTree.root as LeafNode).length;
            
            ropeTree.insert(testId, 1);
            
            const leafRoot = ropeTree.root as LeafNode;
            expect(leafRoot.length).toBe(initialLength + 1);
            
            // Find the inserted element
            const found = leafRoot.ids.find(id => id.compare(testId) === 0);
            expect(found).toBeTruthy();
        });

        it('should trigger split when leaf exceeds MAX_LENGTH', () => {
            // Insert enough elements to force a split
            for (let i = 0; i < 260; i++) {
                ropeTree.insert(new LseqIdentifier([100 + i], `client-${i}`), i + 1);
            }
            
            // Root should now be InternalNode due to split
            expect(ropeTree.root).toBeInstanceOf(InternalNode);
        });

        it('should maintain order after multiple insertions', () => {
            const ids = [
                new LseqIdentifier([100], 'client'),
                new LseqIdentifier([200], 'client'),
                new LseqIdentifier([150], 'client'), // Insert in middle
                new LseqIdentifier([50], 'client')   // Insert at beginning
            ];
            
            ids.forEach((id, index) => {
                ropeTree.insert(id, index + 1);
            });
            
            // Check that order is maintained (sentinels + inserted elements)
            const leafRoot = ropeTree.root as LeafNode;
            const paths = leafRoot.ids.map(id => id.path[0]);
            
            // Should be sorted: [0, 50, 100, 150, 200, 1000000] (sentinels included)
            for (let i = 0; i < paths.length - 1; i++) {
                expect(paths[i]).toBeLessThanOrEqual(paths[i + 1]);
            }
        });
    });

    describe('delete', () => {
        beforeEach(() => {
            // Setup some test data
            ropeTree.insert(new LseqIdentifier([100], 'client-a'), 1);
            ropeTree.insert(new LseqIdentifier([200], 'client-b'), 2);
            ropeTree.insert(new LseqIdentifier([300], 'client-c'), 3);
        });

        it('should throw error when root is null', () => {
            ropeTree.root = null;
            
            expect(() => ropeTree.delete(new LseqIdentifier([1], 'client'), 0))
                .toThrowError("Illegal state: root should always be present");
        });

        it('should delete existing element successfully', () => {
            const targetId = new LseqIdentifier([200], 'client-b');
            const initialLength = (ropeTree.root as LeafNode).length;
            
            ropeTree.delete(targetId, 2);
            
            const leafRoot = ropeTree.root as LeafNode;
            expect(leafRoot.length).toBe(initialLength - 1);
            
            // Verify element is gone
            const found = leafRoot.ids.find(id => id.compare(targetId) === 0);
            expect(found).toBeUndefined();
        });

        it('should handle deletion of non-existent element gracefully', () => {
            const nonExistentId = new LseqIdentifier([999], 'client-unknown');
            const initialLength = (ropeTree.root as LeafNode).length;
            
            spyOn(console, 'warn');
            ropeTree.delete(nonExistentId, 2);
            
            expect(console.warn).toHaveBeenCalledWith("Atom with id not found in leaf at position:", 2);
            expect((ropeTree.root as LeafNode).length).toBe(initialLength);
        });

        it('should handle invalid position gracefully', () => {
            const targetId = new LseqIdentifier([999], 'client-a');
            
            spyOn(console, 'warn');
            ropeTree.delete(targetId, 999);
            
            expect(console.warn).toHaveBeenCalledWith("No leaf found at position:", 999);
        });
    });

    describe('getLastIdInSubtree', () => {
        it('should return last ID from leaf node', () => {
            const leafNode = ropeTree.root as LeafNode;
            const lastId = (ropeTree as any).getLastIdInSubtree(leafNode);
            
            expect(lastId).toBeTruthy();
            expect(lastId.path).toEqual(SENT_END.path);
        });

        it('should return null for empty leaf', () => {
            const emptyLeaf = new LeafNode();
            const lastId = (ropeTree as any).getLastIdInSubtree(emptyLeaf);
            
            expect(lastId).toBeNull();
        });

        it('should navigate through internal nodes', () => {
            // Create internal structure
            const leftLeaf = new LeafNode();
            leftLeaf.insertIdOrdered(new LseqIdentifier([100], 'client'));
            
            const rightLeaf = new LeafNode();
            rightLeaf.insertIdOrdered(new LseqIdentifier([200], 'client'));
            
            const internalNode = new InternalNode(leftLeaf, rightLeaf);
            
            const lastId = (ropeTree as any).getLastIdInSubtree(internalNode);
            
            expect(lastId).toBeTruthy();
            expect(lastId.path).toEqual([200]);
        });

        it('should throw error for invalid node type', () => {
            const invalidNode = {} as any;
            
            expect(() => (ropeTree as any).getLastIdInSubtree(invalidNode))
                .toThrowError("Invalid node type in getLastIdInSubtree");
        });
    });

    describe('printTree', () => {
        it('should print leaf node correctly', () => {
            spyOn(console, 'log');
            
            ropeTree.printTree();
            
            expect(console.log).toHaveBeenCalled();
            const call = (console.log as jasmine.Spy).calls.mostRecent();
            expect(call.args[0]).toContain('Leaf:');
        });

        it('should print internal node structure', () => {
            // Force creation of internal structure
            for (let i = 0; i < 300; i++) {
                ropeTree.insert(new LseqIdentifier([100 + i], 'client'), i + 1);
            }
            
            spyOn(console, 'log');
            ropeTree.printTree();
            
            expect(console.log).toHaveBeenCalled();
            const calls = (console.log as jasmine.Spy).calls.all();
            const hasInternalNode = calls.some(call => call.args[0].includes('Internal Node'));
            expect(hasInternalNode).toBe(true);
        });

        it('should handle null root gracefully', () => {
            ropeTree.root = null;
            
            expect(() => ropeTree.printTree()).not.toThrow();
        });

        it('should throw error for invalid node type in print', () => {
            ropeTree.root = {} as any;
            
            expect(() => ropeTree.printTree())
                .toThrowError("Invalid node type in printTree");
        });
    });

    describe('Integration scenarios', () => {
        it('should handle complete text editing workflow', () => {
            // Insert characters to spell "HELLO"
            const chars = [
                { id: new LseqIdentifier([100], 'client'), pos: 1 },
                { id: new LseqIdentifier([200], 'client'), pos: 2 },
                { id: new LseqIdentifier([300], 'client'), pos: 3 },
                { id: new LseqIdentifier([400], 'client'), pos: 4 },
                { id: new LseqIdentifier([500], 'client'), pos: 5 }
            ];
            
            chars.forEach(({id, pos}) => {
                ropeTree.insert(id, pos);
            });
            
            expect((ropeTree.root as LeafNode).length).toBe(7); // 2 sentinels + 5 chars
            
            // Delete middle character
            ropeTree.delete(chars[2].id, 4); // Delete 3rd character
            
            expect((ropeTree.root as LeafNode).length).toBe(6);
        });

        it('should maintain performance with many operations', () => {
            const startTime = performance.now();
            
            // Insert 100 elements
            for (let i = 0; i < 100; i++) {
                ropeTree.insert(new LseqIdentifier([1000 + i], `client-${i}`), i + 1);
            }
            
            // Delete some elements
            for (let i = 0; i < 20; i++) {
                ropeTree.delete(new LseqIdentifier([1000 + i], `client-${i}`), 1);
            }
            
            const endTime = performance.now();
            
            expect(endTime - startTime).toBeLessThan(1000); // Should complete within 1 second
        });
    });
});
