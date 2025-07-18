import { TreeNode } from './TypeTree';
import { TreeNodeBase } from './TypeTree';

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