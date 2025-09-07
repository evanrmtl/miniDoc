import { LseqIdentifier } from '../CRDT/LseqIdentifier.service';
import { InternalNode } from './InternalNode.service';
import { LeafNode } from './LeafNode.service';
import { TreeNode } from './TypeTree.service';
import { SENT_END } from './Sentinel.service';
import { SENT_START } from './Sentinel.service';
import { Injectable } from '@angular/core';

@Injectable({
    providedIn: 'root'
})
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
                if (previLeaf && previLeaf.leaf.ids.length > 0 && 
                    previLeaf.offset >= 0 && previLeaf.offset < previLeaf.leaf.ids.length) {
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
                if (nextLeaf && nextLeaf.offset < nextLeaf.leaf.ids.length) {
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

    getDeleteIds(treeRoot: TreeNode, position: number): LseqIdentifier | null {
        const search = this.searchInTree(treeRoot, position);
        if (search && search.leaf.ids.length > 0) {
            return search.leaf.getIdAtOffset(search.offset);
        }
        return null;
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

    public insert(node: TreeNode, id: LseqIdentifier): TreeNode {
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
                node.left = this.insert(node.left, id);
            } else {
                node.right = this.insert(node.right, id);
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

    delete(id: LseqIdentifier): void {
        if (!this.root) {
            throw new Error("Illegal state: root should always be present");
        }
        
        const leaf = this.findLeafContainingId(this.root, id);
        
        if (!leaf) {
            console.warn("Atom with id not found in any leaf");
            return;
        }
        
        const index = leaf.ids.findIndex(atomId => atomId.compare(id) === 0);
        if (index !== -1) {
            leaf.ids.splice(index, 1);
        } else {
            console.warn("Atom with id not found in leaf");
        }
    }


    findLeafContainingId(node: TreeNode, id: LseqIdentifier): LeafNode | null {
        if (node instanceof LeafNode) {
            if (node.ids.some(atomId => atomId.compare(id) === 0)) {
            return node;
            }
            return null;
        }
        if (node instanceof InternalNode) {
            const leftResult = this.findLeafContainingId(node.left, id);
            if (leftResult !== null) return leftResult;
            return this.findLeafContainingId(node.right, id);
        }
        return null;
    }
}