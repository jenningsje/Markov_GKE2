/**
 * Copyright (c) 2018-2023 mol* contributors, licensed under MIT, See LICENSE file for more info.
 *
 * @author Adam Midlik <midlik@gmail.com>
 */
import * as B from 'benchmark';
import { arrayExtend, range, sortIfNeeded } from '../mol-util/array.js';
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
        return { init, offset: 0, copies: range(nCopies).map(init) };
    },
    get(copies) {
        return (copies.offset < copies.copies.length) ? copies.copies[copies.offset++] : copies.init();
    },
};
export function runBenchmarks(arrayLength) {
    const _data = randomFloats(arrayLength);
    const _sortedData = arrayExtend([], _data).sort(le);
    const _worstData = arrayExtend([], _sortedData);
    [_worstData[arrayLength - 1], _worstData[arrayLength - 2]] = [_worstData[arrayLength - 2], _worstData[arrayLength - 1]];
    const nCopies = 100;
    let randomData, sortedData, worstData;
    function prepareData() {
        randomData = Copies.create(() => arrayExtend([], _data), nCopies);
        sortedData = Copies.create(() => arrayExtend([], _sortedData), nCopies);
        worstData = Copies.create(() => arrayExtend([], _worstData), nCopies);
    }
    prepareData();
    const suite = new B.Suite();
    suite
        .add(`native sort (${arrayLength}, pre-sorted)`, () => Copies.get(sortedData).sort(le))
        .add(`sortIfNeeded (${arrayLength}, pre-sorted)`, () => sortIfNeeded(Copies.get(sortedData), le))
        .add(`native sort (${arrayLength}, not sorted)`, () => Copies.get(randomData).sort(le))
        .add(`sortIfNeeded (${arrayLength}, not sorted)`, () => sortIfNeeded(Copies.get(randomData), le))
        .add(`native sort (${arrayLength}, worst case)`, () => Copies.get(worstData).sort(le))
        .add(`sortIfNeeded (${arrayLength}, worst case)`, () => sortIfNeeded(Copies.get(worstData), le))
        .on('cycle', (e) => {
        console.log(String(e.target));
        prepareData();
    })
        .run();
    console.log('---------------------');
    console.log('`sortIfNeeded` should be faster than native `sort` on pre-sorted data, same speed on non-sorted data and worst case data (almost sorted array when only the two last elements are swapped)');
}
runBenchmarks(10 ** 6);
