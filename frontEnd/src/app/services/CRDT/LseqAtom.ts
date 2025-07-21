import { LseqIdentifier } from './LseqIdentifier';

export class LseqAtom{
    public id : LseqIdentifier;
    public value: string;

    constructor(id: LseqIdentifier, value: string) {
        this.id = id;
        this.value = value;
    }
}