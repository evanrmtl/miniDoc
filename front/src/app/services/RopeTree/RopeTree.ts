import { LseqIdentifier } from '../CRDT/LseqIdentifier';
import { InternalNode } from './InternalNode';
import { LeafNode } from './LeafNode';
import { TreeNode } from './TypeTree';
import { LSEQ } from '../CRDT/LSEQ';
import { SENT_END } from './Sentinel';
import { SENT_START } from './Sentinel';
import { NgModuleRef } from '@angular/core';

/**
 * RopeTree is a data structure that allows efficient text editing operations.
 * It uses a tree structure to represent text, where each leaf node contains a string,
 * and internal nodes represent concatenations of their children.
 */
export class RopeTree {
    public root: TreeNode | null = null;

    constructor() {
        const leaf = new LeafNode();
        leaf.addId(SENT_START.path, 'sentinel-start');
        leaf.addId(SENT_END.path, 'sentinel-end');
        this.root = leaf;
    }

    getInsertIds(treeRoot: TreeNode, position: number): { p: LseqIdentifier | null, q: LseqIdentifier | null} {
        const search = this.searchInTree(treeRoot, position);

        //case 1 : treeNode is empty
        if (!search) {
            return {
                p: null,
                q: null
            };
        } else { //case 2: position = 0
            if (search.offset === 0){
                let previLeaf = this.searchInTree(treeRoot, position - 1);
                if (previLeaf && previLeaf.leaf.ids.length > 0) {
                    return {
                        p: previLeaf.leaf.ids[previLeaf.leaf.ids.length - 1] || null,
                        q: search.leaf.ids[0] || null
                    };
                }
                return {
                    p: null,
                    q: search.leaf.ids[0] || null
                };
            } else if (search.offset === search.leaf.length) { //cas 3: position = length
                let nextLeaf = this.searchInTree(treeRoot, position + 1);
                if (nextLeaf && nextLeaf.leaf.ids.length > 0) {
                    return {
                        p: search.leaf.ids[search.leaf.ids.length - 1] || null,
                        q: nextLeaf.leaf.ids[0] || null
                    };
                }
                return {
                    p: search.leaf.ids[search.leaf.ids.length - 1] || null,
                    q: null
                };
            } else { //case 4: 0 < position < length
                const p = search.leaf.getIdAtOffset(search.offset - 1);
                const q = search.leaf.getIdAtOffset(search.offset);
                if (p && q) {
                    return { p, q };
                }
            }
        }
        // Default return to satisfy all code paths
        return { p: null, q: null };
    }

    searchInTree(node: TreeNode, position: number): { leaf: LeafNode, offset: number } | null {
        if (node instanceof LeafNode) {
            return { leaf: node, offset: position };
        }
        if (node instanceof InternalNode) {
            if (position < node.left.length) {
                return this.searchInTree(node.left, position);
            } else {
                return this.searchInTree(node.right, position - node.left.length);
            }
        }
        throw new Error("Invalid tree structure");
    }

    private insertRec(node: TreeNode, id: LseqIdentifier, position: number): TreeNode {
        if (node instanceof LeafNode) {
            node.insertIdOrdered(id);
            if (node.length <= node.MAX_LENGTH) {
                return node;
            } else {
                const { leftLeaf, rightLeaf } = node.split();
                return new InternalNode(leftLeaf, rightLeaf);
            }
        }
        if (node instanceof InternalNode) {
            const leftMaxId = this.getLastIdInSubtree(node.left);
            if (!leftMaxId || id.compare(leftMaxId) < 0) {
                node.left = this.insertRec(node.left, id, position);
            } else {
                node.right = this.insertRec(node.right, id, position - node.left.length);
            }
            node.length = node.left.length + node.right.length;
            return node;
        }
        throw new Error("Invalid node type in insertRec");
    }

    private getLastIdInSubtree(node: TreeNode): LseqIdentifier | null {
        if (node instanceof LeafNode) {
            return node.ids[node.ids.length - 1] || null;
        }
        if (node instanceof InternalNode) {
            const rightLastId = this.getLastIdInSubtree(node.right);
            return rightLastId || this.getLastIdInSubtree(node.left);
        }
        throw new Error("Invalid node type in getLastIdInSubtree");
    }

    insert(id: LseqIdentifier, position: number): void {
        if (!this.root) {
            throw new Error("Illegal state: root should always be present (initialized with sentinels)");
        }
        this.root = this.insertRec(this.root, id, position);
    }

    delete(id: LseqIdentifier, position: number): void {
        if (!this.root) {
            throw new Error("Illegal state: root should always be present");
        }
        const search = this.searchInTree(this.root, position);
        if (!search) {
            console.warn("No leaf found at position:", position);
            return;
        }
        const leaf = search.leaf;
        const index = leaf.ids.findIndex(atom => atom.compare(id) === 0);
        if (index !== -1) {
            leaf.ids.splice(index, 1);
        } else {
            console.warn("Atom with id not found in leaf at position:", position);
        }
    }

    printTree(node: TreeNode | null = this.root, depth: number = 0): void {
        if (!node) return;
        if (node instanceof LeafNode) {
            console.log(' '.repeat(depth * 2) + `Leaf: ${node.ids.map(id => id.path.join('.')).join(', ')}`);
        } else if (node instanceof InternalNode) {
            console.log(' '.repeat(depth * 2) + `Internal Node:`);
            this.printTree(node.left, depth + 1);
            this.printTree(node.right, depth + 1);
        } else {
            throw new Error("Invalid node type in printTree");
        }
    }
}