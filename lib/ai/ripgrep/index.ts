/**
 * ripgrep Module
 * 
 * Fast pattern search using ripgrep.
 */

export {
    searchWithRipgrep,
    isRipgrepAvailable,
    getRipgrepPath,
    type RipgrepMatch,
    type RipgrepOptions,
    type RipgrepSearchResult,
} from "./ripgrep";

export { createLocalGrepTool } from "./tool";
