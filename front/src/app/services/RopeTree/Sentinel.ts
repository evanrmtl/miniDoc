import { LseqIdentifier } from "./../CRDT/LseqIdentifier";

export const SENT_START = new LseqIdentifier([-Infinity], "sentinel-start");
export const SENT_END   = new LseqIdentifier([Infinity], "sentinel-end");