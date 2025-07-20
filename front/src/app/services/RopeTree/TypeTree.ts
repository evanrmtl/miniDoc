import { InternalNode } from './InternalNode';
import { LeafNode } from './LeafNode';

export type TreeNode = InternalNode | LeafNode;

export interface TreeNodeBase {
    length: number;
}