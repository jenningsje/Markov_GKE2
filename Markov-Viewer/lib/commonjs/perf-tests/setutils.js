"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const B = tslib_1.__importStar(require("benchmark"));
function randomInt(min, max) {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min) + min);
}
function createRandomSet(count, min, max) {
    const set = new Set();
    for (let i = 0; i < count; ++i) {
        set.add(randomInt(min, max));
    }
    return set;
}
function createSerialSet(count, offset) {
    const set = new Set();
    for (let i = 0; i < count; ++i) {
        set.add(i + offset);
    }
    return set;
}
function isSuperset(setA, setB) {
    if (setA.size < setB.size)
        return false;
    let flag = true;
    setB.forEach(elem => {
        if (!setA.has(elem))
            flag = false;
    });
    return flag;
}
function isSuperset2(setA, setB) {
    if (setA.size < setB.size)
        return false;
    let flag = true;
    setB.forEach(elem => {
        if (flag && !setA.has(elem))
            flag = false;
    });
    return flag;
}
function isSupersetIter(setA, setB) {
    if (setA.size < setB.size)
        return false;
    for (const elem of setB) {
        if (!setA.has(elem))
            return false;
    }
    return true;
}
function areIntersecting(setA, setB) {
    if (setA.size < setB.size)
        [setA, setB] = [setB, setA];
    let flag = false;
    setB.forEach(elem => {
        if (setA.has(elem))
            flag = true;
    });
    return flag;
}
function areIntersecting2(setA, setB) {
    if (setA.size < setB.size)
        [setA, setB] = [setB, setA];
    let flag = false;
    setB.forEach(elem => {
        if (!flag && setA.has(elem))
            flag = true;
    });
    return flag;
}
function areIntersectingIter(setA, setB) {
    if (setA.size < setB.size)
        [setA, setB] = [setB, setA];
    for (const elem of setB) {
        if (setA.has(elem))
            return true;
    }
    return false;
}
function run(count, setA, setB) {
    console.log('count', count);
    const suite = new B.Suite();
    suite
        .add('isSuperset', () => isSuperset(setA, setB))
        .add('isSuperset2', () => isSuperset2(setA, setB))
        .add('isSupersetIter', () => isSupersetIter(setA, setB))
        .add('areIntersecting', () => areIntersecting(setA, setB))
        .add('areIntersecting2', () => areIntersecting2(setA, setB))
        .add('areIntersectingIter', () => areIntersectingIter(setA, setB))
        .on('cycle', (e) => console.log(String(e.target)))
        .run();
}
function runRandom(count) {
    console.log('random');
    const setA = createRandomSet(count, 0, count * 10);
    const setB = createRandomSet(count, 0, count * 10);
    run(count, setA, setB);
}
function runSerial(count) {
    console.log('serial');
    const setA = createSerialSet(count * 2, 0);
    const setB = createSerialSet(count, Math.ceil(count / 2));
    run(count, setA, setB);
}
runRandom(1000);
runRandom(1000000);
runSerial(1000);
runSerial(1000000);
// random
// count 1000
// isSuperset x 145,112 ops/sec ±0.39% (97 runs sampled)
// isSuperset2 x 272,975 ops/sec ±0.27% (99 runs sampled)
// isSupersetIter x 144,258,479 ops/sec ±0.35% (97 runs sampled)
// areIntersecting x 143,989 ops/sec ±0.43% (97 runs sampled)
// areIntersecting2 x 239,137 ops/sec ±0.22% (99 runs sampled)
// areIntersectingIter x 3,461,090 ops/sec ±0.26% (100 runs sampled)
// random
// count 1000000
// isSuperset x 20.59 ops/sec ±2.89% (39 runs sampled)
// isSuperset2 x 276 ops/sec ±0.36% (89 runs sampled)
// isSupersetIter x 84,189,906 ops/sec ±0.17% (98 runs sampled)
// areIntersecting x 25.76 ops/sec ±2.57% (46 runs sampled)
// areIntersecting2 x 253 ops/sec ±0.26% (93 runs sampled)
// areIntersectingIter x 149,926,429 ops/sec ±0.25% (99 runs sampled)
// serial
// count 1000
// isSuperset x 144,452 ops/sec ±0.40% (99 runs sampled)
// isSuperset2 x 132,504 ops/sec ±0.31% (97 runs sampled)
// isSupersetIter x 220,582 ops/sec ±0.24% (99 runs sampled)
// areIntersecting x 142,648 ops/sec ±0.30% (97 runs sampled)
// areIntersecting2 x 240,682 ops/sec ±0.29% (90 runs sampled)
// areIntersectingIter x 85,315,658 ops/sec ±2.11% (91 runs sampled)
// serial
// count 1000000
// isSuperset x 17.33 ops/sec ±1.91% (48 runs sampled)
// isSuperset2 x 14.19 ops/sec ±1.69% (40 runs sampled)
// isSupersetIter x 26.95 ops/sec ±1.51% (49 runs sampled)
// areIntersecting x 14.74 ops/sec ±1.35% (41 runs sampled)
// areIntersecting2 x 241 ops/sec ±0.28% (89 runs sampled)
// areIntersectingIter x 150,801,703 ops/sec ±0.22% (99 runs sampled)
