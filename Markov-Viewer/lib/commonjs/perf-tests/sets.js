"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.IntVsStringIndices = exports.ObjectVsMap = exports.Tuples = exports.Union = void 0;
exports.testSegments = testSegments;
const tslib_1 = require("tslib");
const B = tslib_1.__importStar(require("benchmark"));
const int_1 = require("../mol-data/int.js");
// import { ElementSet } from 'mol-model/structure'
// export namespace Iteration {
//     const U = 1000, V = 2500;
//     const control: number[] = [];
//     const sets = Object.create(null);
//     for (let i = 1; i < U; i++) {
//         const set = [];
//         for (let j = 1; j < V; j++) {
//             control[control.length] = j * j + 1;
//             set[set.length] = j * j + 1;
//         }
//         sets[i * i] = OrdSet.ofSortedArray(set);
//     }
//     const ms = ElementSet.create(sets);
//     export function native() {
//         let s = 0;
//         for (let i = 0, _i = control.length; i < _i; i++) s += control[i];
//         return s;
//     }
//     export function iterators() {
//         let s = 0;
//         const it = ElementSet.atoms(ms);
//         while (it.hasNext) {
//             const v = it.move();
//             s += Tuple.snd(v);
//         }
//         return s;
//     }
//     export function elementAt() {
//         let s = 0;
//         for (let i = 0, _i = ElementSet.atomCount(ms); i < _i; i++) s += Tuple.snd(ElementSet.atomGetAt(ms, i));
//         return s;
//     }
//     export function manual() {
//         let s = 0;
//         const keys = ElementSet.unitIds(ms);
//         for (let i = 0, _i = OrdSet.size(keys); i < _i; i++) {
//             const set = ElementSet.unitGetById(ms, OrdSet.getAt(keys, i));
//             for (let j = 0, _j = OrdSet.size(set); j < _j; j++) {
//                 s += OrdSet.getAt(set, j);
//             }
//         }
//         return s;
//     }
//     export function manual1() {
//         let s = 0;
//         for (let i = 0, _i = ElementSet.unitCount(ms); i < _i; i++) {
//             const set = ElementSet.unitGetByIndex(ms, i);
//             for (let j = 0, _j = OrdSet.size(set); j < _j; j++) {
//                 s += OrdSet.getAt(set, j);
//             }
//         }
//         return s;
//     }
//     export function run() {
//         const suite = new B.Suite();
//         // const values: number[] = [];
//         // for (let i = 0; i < 1000000; i++) values[i] = (Math.random() * 1000) | 0;
//         console.log(Iteration.native(), Iteration.iterators(), Iteration.elementAt(), Iteration.manual(), Iteration.manual1());
//         suite
//             .add('native', () => Iteration.native())
//             .add('iterators', () => Iteration.iterators())
//             .add('manual', () => Iteration.manual())
//             .add('manual1', () => Iteration.manual1())
//             .add('el at', () => Iteration.elementAt())
//             .on('cycle', (e: any) => console.log(String(e.target)))
//             .run();
//     }
// }
var Union;
(function (Union) {
    function createArray(n) {
        const data = new Int32Array(n);
        let c = (Math.random() * 100) | 0;
        for (let i = 0; i < n; i++) {
            data[i] = c;
            c += 1 + (Math.random() * 100) | 0;
        }
        return data;
    }
    function rangeArray(o, n) {
        const data = new Int32Array(n);
        for (let i = 0; i < n; i++) {
            data[i] = o + i;
        }
        return data;
    }
    function createData(array) {
        const obj = Object.create(null);
        const set = new Set();
        for (let i = 0; i < array.length; i++) {
            const a = array[i];
            obj[a] = 1;
            set.add(a);
        }
        return { ordSet: int_1.OrderedSet.ofSortedArray(array), obj, set };
    }
    function unionOS(a, b) {
        return int_1.OrderedSet.union(a, b);
    }
    function intOS(a, b) {
        return int_1.OrderedSet.intersect(a, b);
    }
    function unionO(a, b) {
        const ret = Object.create(null);
        for (const k of Object.keys(a))
            ret[k] = 1;
        for (const k of Object.keys(b))
            ret[k] = 1;
        return ret;
    }
    function intO(a, b) {
        const ret = Object.create(null);
        for (const k of Object.keys(a))
            if (b[k])
                ret[k] = 1;
        return ret;
    }
    function _setAdd(x) { this.add(x); }
    function unionS(a, b) {
        const ret = new Set();
        a.forEach(_setAdd, ret);
        b.forEach(_setAdd, ret);
        return ret;
    }
    function _setInt(x) { if (this.other.has(x))
        this.set.add(x); }
    function intS(a, b) {
        if (a.size < b.size) {
            const ctx = { set: new Set(), other: b };
            a.forEach(_setInt, ctx);
            return ctx.set;
        }
        else {
            const ctx = { set: new Set(), other: a };
            b.forEach(_setInt, ctx);
            return ctx.set;
        }
    }
    function run() {
        const suite = new B.Suite();
        const { ordSet: osA, set: sA, obj: oA } = createData(createArray(1000));
        const { ordSet: osB, set: sB, obj: oB } = createData(createArray(1000));
        console.log(int_1.OrderedSet.size(unionOS(osA, osB)), Object.keys(unionO(oA, oB)).length, unionS(sA, sB).size);
        console.log(int_1.OrderedSet.size(intOS(osA, osB)), Object.keys(intO(oA, oB)).length, intS(sA, sB).size);
        suite
            .add('u ord set', () => unionOS(osA, osB))
            .add('u obj', () => unionO(oA, oB))
            .add('u ES6 set', () => unionS(sA, sB))
            .add('i ord set', () => intOS(osA, osB))
            .add('i obj', () => intO(oA, oB))
            .add('i ES6 set', () => intS(sA, sB))
            .on('cycle', (e) => console.log(String(e.target)))
            .run();
    }
    Union.run = run;
    function runR() {
        const suite = new B.Suite();
        const rangeA = rangeArray(145, 1000);
        const rangeB = rangeArray(456, 1000);
        const { ordSet: osA, set: sA, obj: oA } = createData(rangeA);
        const { ordSet: osB, set: sB, obj: oB } = createData(rangeB);
        console.log(int_1.OrderedSet.size(unionOS(osA, osB)), Object.keys(unionO(oA, oB)).length, unionS(sA, sB).size);
        console.log(int_1.OrderedSet.size(intOS(osA, osB)), Object.keys(intO(oA, oB)).length, intS(sA, sB).size);
        suite
            .add('u ord set', () => unionOS(osA, osB))
            .add('u obj', () => unionO(oA, oB))
            .add('u ES6 set', () => unionS(sA, sB))
            .add('i ord set', () => intOS(osA, osB))
            .add('i obj', () => intO(oA, oB))
            .add('i ES6 set', () => intS(sA, sB))
            .on('cycle', (e) => console.log(String(e.target)))
            .run();
    }
    Union.runR = runR;
})(Union || (exports.Union = Union = {}));
// export namespace Build {
//     function createSorted() {
//         const b = ElementSet.LinearBuilder(ElementSet.Empty);
//         for (let i = 0; i < 10; i++) {
//             for (let j = 0; j < 1000; j++) {
//                 b.add(i, j);
//             }
//         }
//         return b.getSet();
//     }
//     function createByUnit() {
//         const b = ElementSet.LinearBuilder(ElementSet.Empty);
//         for (let i = 0; i < 10; i++) {
//             b.beginUnit();
//             for (let j = 0; j < 1000; j++) {
//                 b.addToUnit(j);
//             }
//             b.commitUnit(i);
//         }
//         return b.getSet();
//     }
//     export function run() {
//         const suite = new B.Suite();
//         suite
//             .add('create sorted', () => createSorted())
//             .add('create by unit', () => createByUnit())
//             .on('cycle', (e: any) => console.log(String(e.target)))
//             .run();
//     }
// }
var Tuples;
(function (Tuples) {
    function createData(n) {
        const ret = new Float64Array(n);
        for (let i = 0; i < n; i++) {
            ret[i] = int_1.Tuple.create(i, i * i + 1);
        }
        return ret;
    }
    function sum1(data) {
        let s = 0;
        for (let i = 0, _i = data.length; i < _i; i++) {
            s += int_1.Tuple.fst(data[i]) + int_1.Tuple.snd(data[i]);
        }
        return s;
    }
    function sum2(data) {
        let s = 0;
        for (let i = 0, _i = data.length; i < _i; i++) {
            const t = data[i];
            s += int_1.Tuple.fst(t) + int_1.Tuple.snd(t);
        }
        return s;
    }
    function run() {
        const suite = new B.Suite();
        const data = createData(10000);
        suite
            .add('sum fst/snd', () => sum1(data))
            .add('sum fst/snd 1', () => sum2(data))
            .on('cycle', (e) => console.log(String(e.target)))
            .run();
    }
    Tuples.run = run;
})(Tuples || (exports.Tuples = Tuples = {}));
function testSegments() {
    const data = int_1.OrderedSet.ofSortedArray([4, 9, 10, 11, 14, 15, 16]);
    const segs = int_1.Segmentation.create([0, 4, 10, 12, 13, 15, 25]);
    const it = int_1.Segmentation.transientSegments(segs, data);
    while (it.hasNext) {
        const s = it.move();
        for (let j = s.start; j < s.end; j++) {
            console.log(`${s.index}: ${int_1.OrderedSet.getAt(data, j)}`);
        }
    }
}
var ObjectVsMap;
(function (ObjectVsMap) {
    function objCreate(keys) {
        const m = Object.create(null);
        m.x = 0;
        delete m.x;
        for (let i = 0, _i = keys.length; i < _i; i++) {
            m[keys[i]] = i * i;
        }
        return m;
    }
    function mapCreate(keys) {
        const m = new Map();
        for (let i = 0, _i = keys.length; i < _i; i++) {
            m.set(keys[i], i * i);
        }
        return m;
    }
    function objQuery(keys, n, obj) {
        let ret = 0;
        for (let i = 0; i < n; i++)
            ret += obj[keys[i % n]];
        return ret;
    }
    function mapQuery(keys, n, map) {
        let ret = 0;
        for (let i = 0; i < n; i++)
            ret += map.get(keys[i % n]);
        return ret;
    }
    function run() {
        const suite = new B.Suite();
        const keys = [];
        for (let i = 0; i < 1000; i++)
            keys[i] = 'k' + i;
        const N = 100000;
        const obj = objCreate(keys);
        const map = mapCreate(keys);
        suite
            .add('c obj', () => objCreate(keys))
            .add('c map', () => mapCreate(keys))
            .add('q obj', () => objQuery(keys, N, obj))
            .add('q map', () => mapQuery(keys, N, map))
            .on('cycle', (e) => console.log(String(e.target)))
            .run();
    }
    ObjectVsMap.run = run;
})(ObjectVsMap || (exports.ObjectVsMap = ObjectVsMap = {}));
var IntVsStringIndices;
(function (IntVsStringIndices) {
    function createCacheKeys(n) {
        const data = Object.create(null), keys = [];
        data.__ = void 0;
        delete data.__;
        for (let i = 1; i <= n; i++) {
            const k = i * (i + 1);
            keys[keys.length] = k;
            data[k] = i + 1;
        }
        return { data, keys };
    }
    function createMapKeys(n) {
        const map = new Map(), keys = [];
        for (let i = 1; i <= n; i++) {
            const k = i * (i + 1);
            keys[keys.length] = k;
            map.set(k, i + 1);
        }
        return { map, keys };
    }
    function createInt(n) {
        const ret = Object.create(null);
        ret.__ = void 0;
        delete ret.__;
        for (let i = 1; i <= n; i++)
            ret[i * (i + 1)] = i + 1;
        return ret;
    }
    IntVsStringIndices.createInt = createInt;
    function createStr(n) {
        const ret = Object.create(null);
        ret.__ = void 0;
        delete ret.__;
        for (let i = 1; i <= n; i++)
            ret['' + (i * (i + 1))] = i + 1;
        return ret;
    }
    IntVsStringIndices.createStr = createStr;
    function createMap(n) {
        const map = new Map();
        for (let i = 1; i <= n; i++)
            map.set(i * (i + 1), i + 1);
        return map;
    }
    IntVsStringIndices.createMap = createMap;
    function sumInt(xs) {
        let s = 0;
        const keys = Object.keys(xs);
        for (let i = 0, _i = keys.length; i < _i; i++)
            s += xs[+keys[i]];
        return s;
    }
    IntVsStringIndices.sumInt = sumInt;
    function sumStr(xs) {
        let s = 0;
        const keys = Object.keys(xs);
        for (let i = 0, _i = keys.length; i < _i; i++)
            s += xs[keys[i]];
        return s;
    }
    IntVsStringIndices.sumStr = sumStr;
    function sumMap(map) {
        let s = 0;
        const values = map.keys();
        while (true) {
            const { done, value } = values.next();
            if (done)
                break;
            s += value;
        }
        return s;
    }
    IntVsStringIndices.sumMap = sumMap;
    function sumCached(xs) {
        let s = 0;
        const keys = xs.keys, data = xs.data;
        for (let i = 0, _i = keys.length; i < _i; i++)
            s += data[keys[i]];
        return s;
    }
    IntVsStringIndices.sumCached = sumCached;
    function sumKeyMap(xs) {
        let s = 0;
        const keys = xs.keys, map = xs.map;
        for (let i = 0, _i = keys.length; i < _i; i++)
            s += map.get(keys[i]);
        return s;
    }
    IntVsStringIndices.sumKeyMap = sumKeyMap;
    function run() {
        const N = 1000;
        // const int = createInt(N);
        const map = createMap(N);
        // const str = createStr(N);
        const keys = createCacheKeys(N);
        const keyMap = createMapKeys(N);
        console.log(sumMap(map), sumCached(keys), sumKeyMap(keyMap));
        new B.Suite()
            // .add('c int', () => createInt(N))
            .add('q map', () => sumMap(map))
            .add('c map', () => createMap(N))
            .add('c mk', () => createMapKeys(N))
            // .add('c str', () => createStr(N))
            .add('c cc', () => createCacheKeys(N))
            // .add('q int', () => sumInt(int))
            .add('q mk', () => sumKeyMap(keyMap))
            // .add('q str', () => sumStr(str))
            .add('q cc', () => sumCached(keys))
            .on('cycle', (e) => console.log(String(e.target)))
            .run();
    }
    IntVsStringIndices.run = run;
})(IntVsStringIndices || (exports.IntVsStringIndices = IntVsStringIndices = {}));
IntVsStringIndices.run();
// ObjectVsMap.run();
// testSegments();
// Tuples.run();
// interface AA { kind: 'a' }
// //interface BB { kind: 'b' }
// interface AB { kind: 'a' | 'b' }
// declare const a: AA;
// export const ab: AB = a;
