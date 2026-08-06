import { Structure } from '../mol-model/structure.js';
import { MmcifFormat } from '../mol-model-formats/structure/mmcif.js';
export declare function readCIF(path: string): Promise<{
    mmcif: MmcifFormat.Data;
    models: import("../mol-model/structure.js").Trajectory;
    structures: Structure[];
}>;
export declare function test(): Promise<void>;
