import { TreeNodeBase } from './TypeTree.service';
import { LseqIdentifier } from '../CRDT/LseqIdentifier.service';

export class LeafNode implements TreeNodeBase {
    public MAX_LENGTH = 256;
    public ids: LseqIdentifier[];

    constructor(ids: LseqIdentifier[] = []) {
        this.MAX_LENGTH = 256;
        this.ids = [...ids];
    }

    findOrderedInsertIndex(id: LseqIdentifier): number {
        for (let i = 0; i < this.ids.length; i++) {
            if (id.compare(this.ids[i]) < 0) return i;
        }
        return this.ids.length;
    }

    insertIdOrdered(id: LseqIdentifier) {
        const idx = this.findOrderedInsertIndex(id);
        this.ids.splice(idx, 0, id);
    }

    split(): {leftLeaf : LeafNode, rightLeaf : LeafNode}{
        const midIndex = Math.floor(this.length / 2);
        const leftLeaf = new LeafNode(this.ids.slice(0, midIndex));
        const rightLeaf = new LeafNode(this.ids.slice(midIndex));
        return { leftLeaf, rightLeaf };
    }


    insertIdAt(position: number, id: LseqIdentifier): void {
        const pos = Math.max(0, Math.min(position, this.ids.length));
        this.ids.splice(pos, 0, id);
    }

    addId(path: number[], clientId: string): boolean {
        if (this.ids.length >= this.MAX_LENGTH) {
            return false; // Cannot add more ids
        }
        this.ids.push(new LseqIdentifier(path, clientId));
        return true;
    }

    
    get length(): number {
        return this.ids.length;
    }

    getIdAtOffset(offset: number): LseqIdentifier | null {
        if (offset < 0 || offset >= this.ids.length) {
            return null;
        }
        return this.ids[offset];
    }
}