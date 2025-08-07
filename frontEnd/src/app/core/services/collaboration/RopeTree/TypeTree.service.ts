import { InternalNode } from './InternalNode.service';
import { LeafNode } from './LeafNode.service';

export type TreeNode = InternalNode | LeafNode;

export interface TreeNodeBase {
    length: number;
}