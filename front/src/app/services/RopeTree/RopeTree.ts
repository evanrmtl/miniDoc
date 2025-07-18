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
        const startSentinel = new LeafNode();
        startSentinel.addId(SENT_START.path, 'sentinel-start');
        const endSentinel = new LeafNode();
        endSentinel.addId(SENT_END.path, 'sentinel-end');

        this.root = new InternalNode(startSentinel, endSentinel);
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
            node.insertIdAt(position, id);
            if (node.length > node.MAX_LENGTH) {
                const { leftLeaf, rightLeaf } = node.split();
                return new InternalNode(leftLeaf, rightLeaf);
            }
            return node;
        }
        if (node instanceof InternalNode) {
            if (position < node.left.length) {
                node.left = this.insertRec(node.left, id, position);
            } else {
                node.right = this.insertRec(node.right, id, position - node.left.length);
            }
            node.length = node.left.length + node.right.length;
            return node;
        }
        throw new Error("Invalid node type in insertRec");
    }

    insert(id: LseqIdentifier, position: number): void {
        if (!this.root) {
            throw new Error("Illegal state: root should always be present (initialized with sentinels)");
        }
        this.root = this.insertRec(this.root, id, position);
    }
    
    printTree(node: TreeNode | null = this.root, depth: number = 0): string {
        if (!node) return '';
        let result = '';
        if (node instanceof LeafNode) {
            result += ' '.repeat(depth * 2) + 'LeafNode: ' + node.ids.map(id => '[clientId: ' + id.clientId + ', path: ' + id.path + ']').join(', ') + '\n';
        } else if (node instanceof InternalNode) {
            result += ' '.repeat(depth * 2) + 'InternalNode:\n';
            result += this.printTree(node.left, depth + 1);
            result += this.printTree(node.right, depth + 1);
        }
        return result;
    }
}