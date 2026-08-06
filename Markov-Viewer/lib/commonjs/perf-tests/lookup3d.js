"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.readCIF = readCIF;
exports.test = test;
const tslib_1 = require("tslib");
const util = tslib_1.__importStar(require("util"));
const fs = tslib_1.__importStar(require("fs"));
const cif_1 = require("../mol-io/reader/cif.js");
const structure_1 = require("../mol-model/structure.js");
const geometry_1 = require("../mol-math/geometry.js");
// import { sortArray } from 'mol-data/util';
const int_1 = require("../mol-data/int.js");
const mmcif_1 = require("../mol-model-formats/structure/mmcif.js");
const boundary_1 = require("../mol-math/geometry/boundary.js");
require('util.promisify').shim();
const readFileAsync = util.promisify(fs.readFile);
async function readData(path) {
    if (path.match(/\.bcif$/)) {
        const input = await readFileAsync(path);
        const data = new Uint8Array(input.byteLength);
        for (let i = 0; i < input.byteLength; i++)
            data[i] = input[i];
        return data;
    }
    else {
        return readFileAsync(path, 'utf8');
    }
}
async function readCIF(path) {
    const input = await readData(path);
    const comp = typeof input === 'string' ? cif_1.CIF.parseText(input) : cif_1.CIF.parseBinary(input);
    const parsed = await comp.run();
    if (parsed.isError) {
        throw parsed;
    }
    const models = await (0, mmcif_1.trajectoryFromMmCIF)(parsed.result.blocks[0]).run();
    const structures = [structure_1.Structure.ofModel(models.representative)];
    return { mmcif: models.representative.sourceData.data, models, structures };
}
async function test() {
    const { mmcif, structures } = await readCIF('e:/test/quick/1tqn_updated.cif');
    const position = { x: mmcif.db.atom_site.Cartn_x.toArray(), y: mmcif.db.atom_site.Cartn_y.toArray(), z: mmcif.db.atom_site.Cartn_z.toArray(),
        indices: int_1.OrderedSet.ofBounds(0, mmcif.db.atom_site._rowCount),
        // radius: [1, 1, 1, 1]
        // indices: [1]
    };
    const lookup = (0, geometry_1.GridLookup3D)(position, (0, boundary_1.getBoundary)(position));
    console.log(lookup.boundary.box, lookup.boundary.sphere);
    const result = lookup.find(-30.07, 8.178, -13.897, 10);
    console.log(result.count); // , sortArray(result.indices));
    // const sl = structures[0].lookup3d;
    // const result1 = sl.find(-30.07, 8.178, -13.897, 10);
    // console.log(result1.count);//, result1.indices);
    console.log(structures[0].boundary);
    console.log(lookup.boundary);
}
test();
