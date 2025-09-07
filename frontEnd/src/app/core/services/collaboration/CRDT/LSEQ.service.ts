import { LseqIdentifier } from './LseqIdentifier.service';
import { LseqAtom } from './LseqAtom.service';
import { SENT_END, SENT_START } from '../RopeTree/Sentinel.service';
import { inject, Injectable } from '@angular/core';
import { WebSocketState } from '../../../state/websocketState.service';

@Injectable({
    providedIn: 'root'
})
export class LSEQ {

    public bpbm: Map<number, boolean>;
    public boundary: number = 1000;
    public atoms: LseqAtom[] = [];
    private websocketState: WebSocketState = inject(WebSocketState)


    constructor() {
        this.bpbm = new Map<number, boolean>();
    }

    insert(id: LseqIdentifier, value: string): LseqAtom {
        const atom = new LseqAtom(id, value);
        this.addAtom(atom);
        return atom;
    }

    addAtom(atom: LseqAtom): void {
        const index = this.atoms.findIndex(a => {
            return atom.id.compare(a.id) < 0;
        });
        if (index === -1) {
            this.atoms.push(atom);
        } else {
            this.atoms.splice(index, 0, atom);
        }
    }

    delete(id: LseqIdentifier): void {
        const index = this.atoms.findIndex(atom => atom.id.compare(id) === 0);
        if (index !== -1) {
            this.atoms.splice(index, 1);
        }
    }

    alloc(p: number[] | null = null, q: number[]| null = null): LseqIdentifier {

        if (!p) p = [SENT_START.path[0]];
        if (!q) q = [SENT_END.path[0]];

        let depth = 0;
        let interval = 0
        while (interval < 1){
            depth++;
            const prefixP = this.prefix(p, depth, SENT_START.path[0]);
            const prefixQ = this.prefix(q, depth, SENT_END.path[0]);
            interval = prefixQ[depth - 1] - prefixP[depth - 1] - 1;

        }
        let step = Math.min(this.boundary, interval);

        if (!(this.bpbm.has(depth))) {
            this.bpbm.set(depth, Math.random() >= 0.5);
        }

        let newDigits = this.prefix(p, depth, SENT_START.path[0]);

        if (this.bpbm.get(depth)) {
            let addVal = Math.floor(Math.random() * step) + 1;
            newDigits[depth - 1] = newDigits[depth - 1] + addVal;
        } else {
            let subVal = Math.floor(Math.random() * step) + 1;
            let prefixQ = this.prefix(q, depth, SENT_END.path[0]);
            newDigits[depth - 1] = prefixQ[depth - 1] - subVal;
        }

        if (newDigits.some(val => isNaN(val))) {
            console.error("Generated NaN in path:", newDigits);
            throw new Error("Invalid path generated");
        }

        return new LseqIdentifier(newDigits, this.websocketState.sessionUUID());
    }

    prefix(id : number[], depth: number, pushValue : number): number[]{
        const idCopy = [];
        for (let i = 0; i < depth; i++) {
            if (i < id.length) {
                idCopy.push(id[i]);
            } else {
                idCopy.push(pushValue);
            }
        }
        return idCopy;
    }

    printString(): string {
        return this.atoms.map(atom => atom.value).join('');
    }
}