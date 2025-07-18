export class LseqIdentifier {

    public path: number[];
    public clientId: string;

    constructor(path: number[], clientId: string) {
        this.path = path;
        this.clientId = clientId;
    }

    
    compare(other: LseqIdentifier): number {
        for (let i = 0; i < Math.max(this.path.length, other.path.length); i++) {
            const a = this.path[i] || 0;
            const b = other.path[i] || 0;
            if (a !== b) return a - b;
        }
        return this.clientId.localeCompare(other.clientId);
    }
}