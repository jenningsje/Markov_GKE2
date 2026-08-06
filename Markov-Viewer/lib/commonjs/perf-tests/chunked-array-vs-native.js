"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const B = tslib_1.__importStar(require("benchmark"));
const util_1 = require("../mol-data/util.js");
function testNative(size) {
    const xs = new Array(size);
    for (let i = 0; i < size; i++)
        xs[i] = i * i;
    return xs;
}
function testChunkedTyped(size, chunk) {
    const xs = util_1.ChunkedArray.create(Int32Array, 1, chunk);
    for (let i = 0; i < size; i++)
        util_1.ChunkedArray.add(xs, i * i);
    return util_1.ChunkedArray.compact(xs);
}
function testChunkedNative(size, chunk) {
    const xs = util_1.ChunkedArray.create(Array, 1, chunk);
    for (let i = 0; i < size; i++)
        util_1.ChunkedArray.add(xs, i * i);
    return util_1.ChunkedArray.compact(xs);
}
const suite = new B.Suite();
const N = 70000;
suite
    .add('native', () => testNative(N))
    // .add('chunkedT 0.1k', () => testChunkedTyped(N, 100, false))
    // .add('chunkedT 4k', () => testChunkedTyped(N, 4096, false))
    .add('chunkedT 4k lin', () => testChunkedTyped(N, 4096))
    // .add('chunkedT N / 2', () => testChunkedTyped(N, N / 2, false))
    // .add('chunkedT N', () => testChunkedTyped(N, N, false))
    // .add('chunkedT 2 * N', () => testChunkedTyped(N, 2 * N, false))
    .add('chunkedN N', () => testChunkedNative(N, N))
    .add('chunkedN 0.1k', () => testChunkedNative(N, 100))
    .add('chunkedN N / 2', () => testChunkedNative(N, N / 2))
    .add('chunkedN 2 * N', () => testChunkedNative(N, 2 * N))
    .on('cycle', (e) => {
    console.log(String(e.target));
})
    .run();
// console.log(testChunkedTyped(10, 16));
