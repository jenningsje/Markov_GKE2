"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const sorted_array_1 = require("../mol-data/int/impl/sorted-array.js");
function createData(n) {
    const data = []; // new Int32Array(n);
    let last = (15 * Math.random()) | 0;
    for (let i = 0; i < n; i++) {
        data[i] = last;
        last += (15 * Math.random()) | 0;
    }
    return data;
}
function binarySearchHelper(list, t) {
    let min = 0, max = list.length - 1;
    while (min <= max) {
        if (min + 11 > max) {
            for (let i = min; i <= max; i++) {
                if (t === list[i])
                    return i;
            }
            return -1;
        }
        const mid = (min + max) >> 1;
        const v = list[mid];
        if (t < v)
            max = mid - 1;
        else if (t > v)
            min = mid + 1;
        else
            return mid;
    }
    return -1;
}
function findPredecessorIndexHelper_old(list, t) {
    const index = SortedArray_old.findPredecessorIndex(list, t);
    if (list[index] === t)
        return index;
    return -1;
}
function findPredecessorIndexHelper_new(list, t) {
    const index = (0, sorted_array_1.findPredecessorIndex)(list, t);
    if (list[index] === t)
        return index;
    return -1;
}
/** Old implementation of `findPredecessorIndex` from src/mol-data/int/impl/sorted-array.ts */
var SortedArray_old;
(function (SortedArray_old) {
    function findPredecessorIndex(xs, v) {
        const len = xs.length;
        if (v <= xs[0])
            return 0;
        if (v > xs[len - 1])
            return len;
        return binarySearchPredIndexRange(xs, v, 0, len);
    }
    SortedArray_old.findPredecessorIndex = findPredecessorIndex;
    function binarySearchPredIndexRange(xs, value, start, end) {
        let min = start, max = end - 1;
        while (min < max) {
            // do a linear search if there are only 10 or less items remaining
            if (min + 11 > max) {
                for (let i = min; i <= max; i++) {
                    if (value <= xs[i]) {
                        return i === min ? normalizePred(xs, start, end, i) : i;
                    }
                }
                return max + 1;
            }
            const mid = (min + max) >> 1;
            const v = xs[mid];
            if (value < v)
                max = mid - 1;
            else if (value > v)
                min = mid + 1;
            else
                return normalizePred(xs, start, end, mid);
        }
        if (min > max)
            return max + 1;
        return xs[min] >= value ? min : min + 1;
    }
    function normalizePred(xs, start, end, idx) {
        if (idx <= start)
            return idx;
        const value = xs[idx];
        let i;
        for (i = idx - 1; i >= start; i--) {
            if (xs[i] < value)
                break;
        }
        return i + 1;
    }
})(SortedArray_old || (SortedArray_old = {}));
function objSearch(obj, val) {
    return typeof obj[val] !== 'undefined';
}
function setSearch(set, val) {
    return set.has(val);
}
function maskSearch({ min, max, mask }, val) {
    return val >= min && val <= max && !!mask[val - min];
}
function prepareSet(list) {
    const set = new Set();
    for (let i = 0; i < list.length; i++) {
        const v = list[i];
        set.add(v);
    }
    return set;
}
function prepareObj(list) {
    const obj = Object.create(null);
    for (let i = 0; i < list.length; i++) {
        const v = list[i];
        obj[v] = i;
    }
    return obj;
}
function prepareMask(list) {
    let max = Number.NEGATIVE_INFINITY, min = Number.POSITIVE_INFINITY;
    for (let i = 0; i < list.length; i++) {
        const v = list[i];
        if (max < v)
            max = v;
        if (min > v)
            min = v;
    }
    const mask = new Uint8Array(max - min + 1);
    for (let i = 0; i < list.length; i++) {
        const v = list[i];
        mask[v - min] = 1;
    }
    return { min, max, mask };
}
function testBinary(list, points) {
    let r = 0;
    for (let i = 0, _i = points.length; i < _i; i++) {
        if (binarySearchHelper(list, points[i]) >= 0)
            r += points[i];
    }
    return r;
}
function testObj(obj, points) {
    let r = 0;
    for (let i = 0, _i = points.length; i < _i; i++) {
        if (objSearch(obj, points[i]))
            r += points[i];
    }
    return r;
}
function testSet(set, points) {
    let r = 0;
    for (let i = 0, _i = points.length; i < _i; i++) {
        if (setSearch(set, points[i]))
            r += points[i];
    }
    return r;
}
function testMask(mask, points) {
    let r = 0;
    for (let i = 0, _i = points.length; i < _i; i++) {
        if (maskSearch(mask, points[i]))
            r += points[i];
    }
    return r;
}
function testFindPredecessorIndex_old(list, points) {
    let r = 0;
    for (let i = 0, _i = points.length; i < _i; i++) {
        if (findPredecessorIndexHelper_old(list, points[i]) >= 0)
            r += points[i];
    }
    return r;
}
function testFindPredecessorIndex_new(list, points) {
    let r = 0;
    for (let i = 0, _i = points.length; i < _i; i++) {
        if (findPredecessorIndexHelper_new(list, points[i]) >= 0)
            r += points[i];
    }
    return r;
}
function run(f, n) {
    for (let i = 0; i < n; i++)
        f();
}
(function () {
    const size = 10000;
    const list = createData(size);
    const queryPoints = createData(size);
    const obj = prepareObj(list);
    const set = prepareSet(list);
    const mask = prepareMask(list);
    console.log('list', testBinary(list, queryPoints));
    console.log('obj', testObj(obj, queryPoints));
    console.log('set', testSet(set, queryPoints));
    console.log('mask', testMask(mask, queryPoints));
    console.log('list-findPredecessorIndex-old', testFindPredecessorIndex_old(list, queryPoints));
    console.log('list-findPredecessorIndex-new', testFindPredecessorIndex_new(list, queryPoints));
    console.log('----------------------');
    console.time('obj');
    run(() => testObj(obj, queryPoints), 100);
    console.timeEnd('obj');
    console.time('set');
    run(() => testSet(set, queryPoints), 100);
    console.timeEnd('set');
    console.time('bin-search');
    run(() => testBinary(list, queryPoints), 100);
    console.timeEnd('bin-search');
    console.time('mask-search');
    run(() => testMask(mask, queryPoints), 100);
    console.timeEnd('mask-search');
    console.time('findPredecessorIndex-old');
    run(() => testFindPredecessorIndex_old(list, queryPoints), 100);
    console.timeEnd('findPredecessorIndex-old');
    console.time('findPredecessorIndex-new');
    run(() => testFindPredecessorIndex_new(list, queryPoints), 100);
    console.timeEnd('findPredecessorIndex-new');
    console.log('----------------------');
    console.time('prepare-obj');
    run(() => prepareObj(list), 1);
    console.timeEnd('prepare-obj');
    console.time('prepare-set');
    run(() => prepareSet(list).size, 1);
    console.timeEnd('prepare-set');
    console.time('prepare-mask');
    run(() => prepareMask(list).min, 1);
    console.timeEnd('prepare-mask');
}());
