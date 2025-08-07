import { TreeNode } from './TypeTree.service';
import { TreeNodeBase } from './TypeTree.service';

export class InternalNode implements TreeNodeBase {
    public left: TreeNode;
    public right: TreeNode;
    public length: number;

    constructor(left: TreeNode, right: TreeNode) {
        this.left = left;
        this.right = right;
        this.length = left.length + right.length;
    }
}