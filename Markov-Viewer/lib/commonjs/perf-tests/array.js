"use strict";
/**
 * Copyright (c) 2018-2023 mol* contributors, licensed under MIT, See LICENSE file for more info.
 *
 * @author Adam Midlik <midlik@gmail.com>
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.runBenchmarks = runBenchmarks;
const tslib_1 = require("tslib");
const B = tslib_1.__importStar(require("benchmark"));
const array_1 = require("../mol-util/array.js");
function randomFloats(n) {
    const SCALE = 1000;
    const data = new Array(n);
    for (let i = 0; i < n; i++) {
        data[i] = SCALE * Math.random();
    }
    return data;
}
function le(x, y) { return x - y; }
const Copies = {
    create(init, nCopies) {
        return { init, offset: 0, copies: (0, array_1.range)(nCopies).map(init) };
    },
    get(copies) {
        return (copies.offset < copies.copies.length) ? copies.copies[copies.offset++] : copies.init();
    },
};
function runBenchmarks(arrayLength) {
    const _data = randomFloats(arrayLength);
    const _sortedData = (0, array_1.arrayExtend)([], _data).sort(le);
    const _worstData = (0, array_1.arrayExtend)([], _sortedData);
    [_worstData[arrayLength - 1], _worstData[arrayLength - 2]] = [_worstData[arrayLength - 2], _worstData[arrayLength - 1]];
    const nCopies = 100;
    let randomData, sortedData, worstData;
    function prepareData() {
        randomData = Copies.create(() => (0, array_1.arrayExtend)([], _data), nCopies);
        sortedData = Copies.create(() => (0, array_1.arrayExtend)([], _sortedData), nCopies);
        worstData = Copies.create(() => (0, array_1.arrayExtend)([], _worstData), nCopies);
    }
    prepareData();
    const suite = new B.Suite();
    suite
        .add(`native sort (${arrayLength}, pre-sorted)`, () => Copies.get(sortedData).sort(le))
        .add(`sortIfNeeded (${arrayLength}, pre-sorted)`, () => (0, array_1.sortIfNeeded)(Copies.get(sortedData), le))
        .add(`native sort (${arrayLength}, not sorted)`, () => Copies.get(randomData).sort(le))
        .add(`sortIfNeeded (${arrayLength}, not sorted)`, () => (0, array_1.sortIfNeeded)(Copies.get(randomData), le))
        .add(`native sort (${arrayLength}, worst case)`, () => Copies.get(worstData).sort(le))
        .add(`sortIfNeeded (${arrayLength}, worst case)`, () => (0, array_1.sortIfNeeded)(Copies.get(worstData), le))
        .on('cycle', (e) => {
        console.log(String(e.target));
        prepareData();
    })
        .run();
    console.log('---------------------');
    console.log('`sortIfNeeded` should be faster than native `sort` on pre-sorted data, same speed on non-sorted data and worst case data (almost sorted array when only the two last elements are swapped)');
}
runBenchmarks(10 ** 6);
