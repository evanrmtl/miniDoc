import { LseqIdentifier } from "../CRDT/LseqIdentifier.service";

export const SENT_START = new LseqIdentifier([0], "sentinel-start");
export const SENT_END   = new LseqIdentifier([10000000], "sentinel-end");