"use strict";
/**
 * Copyright (c) 2017 mol* contributors, licensed under MIT, See LICENSE file for more info.
 *
 * @author David Sehnal <david.sehnal@gmail.com>
 */
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const cif_1 = require("../mol-io/writer/cif.js");
const fs = tslib_1.__importStar(require("fs"));
const category1fields = [
    cif_1.CifWriter.Field.str('f1', i => 'v' + i),
    cif_1.CifWriter.Field.int('f2', i => i * i),
    cif_1.CifWriter.Field.float('f3', i => Math.random()),
];
const category2fields = [
    cif_1.CifWriter.Field.str('e1', i => 'v\n' + i),
    cif_1.CifWriter.Field.int('e2', i => i * i),
    cif_1.CifWriter.Field.float('e3', i => Math.random()),
];
function getCat(name) {
    return {
        name,
        instance(ctx) {
            return { fields: ctx.fields, source: [{ rowCount: ctx.rowCount }] };
        }
    };
}
function testText() {
    const enc = cif_1.CifWriter.createEncoder();
    const filter = {
        includeCategory(cat) { return true; },
        includeField(cat, field) { return !(cat === 'cat2' && field === 'e2'); }
    };
    enc.startDataBlock('test');
    enc.setFilter(filter);
    enc.writeCategory(getCat('cat1'), [{ rowCount: 5, fields: category1fields }]);
    enc.writeCategory(getCat('cat2'), [{ rowCount: 1, fields: category2fields }]);
    console.log(enc.getData());
}
testText();
function testBinary() {
    const enc = cif_1.CifWriter.createEncoder({ binary: true });
    const filter = {
        includeCategory(cat) { return true; },
        includeField(cat, field) { return !(cat === 'cat2' && field === 'e2'); }
    };
    enc.startDataBlock('test');
    enc.setFilter(filter);
    enc.writeCategory(getCat('cat1'), [{ rowCount: 5, fields: category1fields }]);
    enc.writeCategory(getCat('cat2'), [{ rowCount: 1, fields: category2fields }]);
    enc.encode();
    const data = enc.getData();
    fs.writeFileSync('e:/test/mol-star/test.bcif', Buffer.from(data));
    console.log('written binary');
}
testBinary();
