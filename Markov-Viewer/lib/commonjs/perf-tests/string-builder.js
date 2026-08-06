"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Test = void 0;
const tslib_1 = require("tslib");
const B = tslib_1.__importStar(require("benchmark"));
const string_builder_1 = require("../mol-util/string-builder.js");
var Test;
(function (Test) {
    function createData(n) {
        const ret = [];
        for (let i = 0; i < n; i++) {
            ret[i] = '' + ((100000000 * Math.random() + 1) | 0);
        }
        return ret;
    }
    function build(data, chunkSize) {
        const sb = string_builder_1.StringBuilder.create(chunkSize);
        for (let i = 0, _i = data.length; i < _i; i++) {
            string_builder_1.StringBuilder.writeSafe(sb, data[i]);
            string_builder_1.StringBuilder.whitespace1(sb);
        }
        return sb;
    }
    function buildWS(data, chunkSize) {
        const sb = string_builder_1.StringBuilder.create(chunkSize);
        for (let i = 0, _i = data.length; i < _i; i++) {
            string_builder_1.StringBuilder.writeSafe(sb, data[i] + ' ');
        }
        return sb;
    }
    // function naive(data: string[]) {
    //     let ret = '';
    //     for (let i = 0, _i = data.length; i < _i; i++) ret += data[i];
    //     return ret;
    // }
    // function join(data: string[]) {
    //     let ret = [];
    //     for (let i = 0, _i = data.length; i < _i; i++) ret[i] = data[i];
    //     return ret.join('');
    // }
    function run() {
        const data = createData(26 * 100000);
        const N = 512;
        const suite = new B.Suite();
        suite
            // .add(`naive`, () => naive(data))
            // .add(`join`, () => join(data))
            // .add(`${N} chunks`, () => SB.getChunks(build(data, N)))
            .add(`${N} str`, () => string_builder_1.StringBuilder.getString(build(data, N)))
            .add(`${N} str ws`, () => string_builder_1.StringBuilder.getString(buildWS(data, N)))
            .on('cycle', (e) => console.log(String(e.target)))
            .run();
    }
    Test.run = run;
})(Test || (exports.Test = Test = {}));
Test.run();
