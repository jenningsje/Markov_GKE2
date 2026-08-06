import * as B from 'benchmark';
import { Column as C } from '../mol-data/db.js';
export var Column;
(function (Column) {
    function createData(n) {
        const ret = new Float32Array(n);
        for (let i = 0; i < n; i++) {
            ret[i] = i * i + 1;
        }
        return ret;
    }
    function raw(xs) {
        let sum = 0;
        for (let i = 0, _i = xs.length; i < _i; i++) {
            sum += xs[i];
        }
        return sum;
    }
    function column(col) {
        let sum = 0;
        for (let i = 0, _i = col.rowCount; i < _i; i++) {
            sum += col.value(i);
        }
        return sum;
    }
    function column1(col) {
        let sum = 0;
        for (let i = 0, _i = col.rowCount; i < _i; i++) {
            sum += col.value(i);
        }
        return sum;
    }
    function val(i) { return i * i + 1; }
    function runMono() {
        const suite = new B.Suite();
        const data = createData(1000);
        const nativeData = [...data];
        const col = C.ofArray({ array: data, schema: C.Schema.float });
        const lambda = C.ofLambda({ value: val, rowCount: data.length, schema: C.Schema.float });
        const cnst = C.ofConst(10, data.length, C.Schema.float);
        suite
            .add('raw', () => raw(data))
            .add('native raw', () => raw(nativeData))
            .add('arraycol', () => column(col))
            .add('arraycol1', () => column(col))
            .add('const', () => column1(cnst))
            .add('arraycol2', () => column(col))
            .add('lambda', () => column1(lambda))
            .on('cycle', (e) => console.log(String(e.target)))
            .run();
    }
    Column.runMono = runMono;
    function runPoly() {
        const suite = new B.Suite();
        const data = createData(10000);
        const nativeData = [...data];
        const col = C.ofArray({ array: data, schema: C.Schema.float });
        const lambda = C.ofLambda({ value: val, rowCount: data.length, schema: C.Schema.float });
        const cnst = C.ofConst(10, data.length, C.Schema.float);
        suite
            .add('raw', () => raw(data))
            .add('native raw', () => raw(nativeData))
            .add('arraycol', () => column(col))
            .add('const', () => column(cnst))
            .add('arraycol2', () => column(col))
            .add('lambda', () => column(lambda))
            .on('cycle', (e) => console.log(String(e.target)))
            .run();
    }
    Column.runPoly = runPoly;
})(Column || (Column = {}));
Column.runMono();
Column.runPoly();
