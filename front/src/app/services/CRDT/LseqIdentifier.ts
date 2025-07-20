export class LseqIdentifier {

    public path: number[];
    public clientId: string;

    constructor(path: number[], clientId: string) {
        this.path = path;
        this.clientId = clientId;
    }

    /**
     * 
     * @param other Another LseqIdentifier to compare with
     * * Compares the path of this identifier with another.
     * * If the paths are different, it returns the difference.
     * * If the paths are the same, it compares the client IDs lexicographically.
     * 
     * @returns A negative number if this path is less than the other,
     *         a positive number if greater, and 0 if equal.
     */
    compare(other: LseqIdentifier): number {
        for (let i = 0; i < Math.max(this.path.length, other.path.length); i++) {
            if (this.path[i] === undefined && other.path[i] !== undefined) return -1;
            if (this.path[i] !== undefined && other.path[i] === undefined) return 1;
            const a = this.path[i] || 0;
            const b = other.path[i] || 0;
            if (a !== b) return a - b;
        }
        return this.clientId.localeCompare(other.clientId);
    }
}