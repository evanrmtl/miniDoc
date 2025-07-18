import { LseqIdentifier } from './LseqIdentifier';
import { LseqAtom } from './LseqAtom';
import { RopeTree } from '../RopeTree/RopeTree';


export class LSEQ {

    public bpbm: Map<number, boolean>;
    public boundary: number = 10000;
    

    constructor() {
        this.bpbm = new Map<number, boolean>();
    }

    insert(id: LseqIdentifier, value: string): LseqAtom {
        return new LseqAtom(id, value);
    }


    alloc(p: number[] | null = null, q: number[]| null = null): LseqIdentifier {

        if (!p) p = [Number.MIN_SAFE_INTEGER];
        if (!q) q = [Number.MAX_SAFE_INTEGER];

        let depth = 0;
        let interval = 0
        while (interval < 1){
            depth++;
            const prefixP = this.prefix(p, depth);
            const prefixQ = this.prefix(q, depth);
            interval = prefixQ[depth - 1] - prefixP[depth - 1] - 1;
        }
        let step = Math.min(this.boundary, interval);

        if (!(this.bpbm.has(depth))) {
            this.bpbm.set(depth, Math.random() >= 0.5);
        }

        let newDigits = this.prefix(p, depth);

        if (this.bpbm.get(depth)) {
            let addVal = Math.floor(Math.random() * step) + 1;
            newDigits[depth - 1] = newDigits[depth - 1] + addVal;
        } else {
            let subVal = Math.floor(Math.random() * step) + 1;
            let prefixQ = this.prefix(q, depth);
            newDigits[depth - 1] = prefixQ[depth - 1] - subVal;
        }

        return new LseqIdentifier(newDigits, 'client-id');
    }

    prefix(id : number[], depth: number): number[] {
        const idCopy = [];
        for (let i = 0; i < depth; i++) {
            if (i < id.length) {
                idCopy.push(id[i]);
            } else {
                idCopy.push(0);
            }
        }
        return idCopy;
    }
}