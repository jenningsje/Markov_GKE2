import * as B from 'benchmark';
import { Iterator as It } from '../mol-data/iterator.js';
function createData(n) {
    const data = []; // new Int32Array(n);
    let last = (15 * Math.random()) | 0;
    for (let i = 0; i < n; i++) {
        data[i] = last;
        last += (15 * Math.random()) | 0;
    }
    return data;
}
export var Iterators;
(function (Iterators) {
    const data = createData(100000);
    function forLoop() {
        let sum = 0;
        for (let i = 0, _i = data.length; i < _i; i++) {
            sum += data[i];
        }
        return sum;
    }
    Iterators.forLoop = forLoop;
    function forOf() {
        let sum = 0;
        for (const e of data) {
            sum += e;
        }
        return sum;
    }
    Iterators.forOf = forOf;
    function forEach() {
        const ctx = { sum: 0 };
        data.forEach(function (v) { this.sum += v; }, ctx);
        return ctx.sum;
    }
    Iterators.forEach = forEach;
    function forEachAllParams() {
        const ctx = { sum: 0 };
        data.forEach(function (v, _, __) { this.sum += v; }, ctx);
        return ctx.sum;
    }
    Iterators.forEachAllParams = forEachAllParams;
    function forEachClosure() {
        let sum = 0;
        data.forEach(v => sum += v);
        return sum;
    }
    Iterators.forEachClosure = forEachClosure;
    function forEachClosureAll() {
        let sum = 0;
        data.forEach((v, _, __) => sum += v);
        return sum;
    }
    Iterators.forEachClosureAll = forEachClosureAll;
    function forEachClosureAllFunction() {
        let sum = 0;
        data.forEach(function (v, _, __) { sum += v; });
        return sum;
    }
    Iterators.forEachClosureAllFunction = forEachClosureAllFunction;
    class _MutableES6Iterator {
        constructor() {
            this.done = true;
            this.value = 0;
            this.xs = void 0;
            this.index = -1;
            this.length = 0;
        }
        [Symbol.iterator]() { return this; }
        ;
        next() {
            const index = ++this.index;
            if (index < this.length)
                this.value = this.xs[index];
            else
                this.done = true;
            return this;
        }
        reset(xs) {
            this.value = xs[0];
            this.length = xs.length;
            this.done = false;
            this.xs = xs;
            this.index = -1;
            return this;
        }
    }
    class _ImmutableES6Iterator {
        constructor() {
            this.done = true;
            this.value = 0;
            this.xs = void 0;
            this.index = -1;
            this.length = 0;
        }
        [Symbol.iterator]() { return this; }
        ;
        next() {
            const index = ++this.index;
            if (index < this.length)
                this.value = this.xs[index];
            else
                this.done = true;
            return { done: this.done, value: this.value };
        }
        reset(xs) {
            this.value = xs[0];
            this.length = xs.length;
            this.done = false;
            this.xs = xs;
            this.index = -1;
            return this;
        }
    }
    function mutableES6Iterator() {
        const it = new _MutableES6Iterator();
        let sum = 0;
        for (let e = it.reset(data).next().value; !it.done; e = it.next().value) {
            sum += e;
        }
        return sum;
    }
    Iterators.mutableES6Iterator = mutableES6Iterator;
    // export function mutableES6IteratorOf() {
    //     const it = new _ImmutableES6Iterator();
    //     let sum = 0;
    //     for (const e of it.reset(data)) {
    //         sum += e;
    //     }
    //     return sum;
    // }
    function immutableES6Iterator() {
        const it = new _ImmutableES6Iterator();
        let sum = 0;
        it.reset(data);
        while (true) {
            const { value, done } = it.next();
            if (done)
                break;
            sum += value;
        }
        return sum;
    }
    Iterators.immutableES6Iterator = immutableES6Iterator;
    class _MutableIterator {
        constructor() {
            this.done = true;
            this.xs = void 0;
            this.index = -1;
            this.length = 0;
        }
        next() {
            const index = ++this.index;
            if (index < this.length)
                return this.xs[index];
            else {
                this.done = true;
                return 0;
            }
        }
        start(xs) {
            this.length = xs.length;
            this.done = !this.length;
            this.xs = xs;
            this.index = 0;
            return this.done ? 0 : this.xs[0];
        }
    }
    function mutableIterator() {
        const it = new _MutableIterator();
        let sum = 0;
        for (let e = it.start(data); !it.done; e = it.next()) {
            sum += e;
        }
        return sum;
    }
    Iterators.mutableIterator = mutableIterator;
    function run() {
        const suite = new B.Suite();
        suite
            .add('for', () => Iterators.forLoop())
            .add('forOf', () => Iterators.forOf())
            .add('forEach', () => Iterators.forEach())
            .add('forEach all params', () => Iterators.forEachAllParams())
            .add('forEachClosure', () => Iterators.forEachClosure())
            .add('forEachClosure all', () => Iterators.forEachClosureAll())
            .add('forEachClosure all function', () => Iterators.forEachClosureAllFunction())
            .add('mutableIterator ES6', () => Iterators.mutableES6Iterator())
            // .add('mutableIteratorOf ES6', () => Iterators.mutableES6IteratorOf())
            .add('immutableIterator ES6', () => Iterators.immutableES6Iterator())
            // .add('immutableIteratorOf ES6', () => Iterators.immutableES6IteratorOf())
            .add('mutableIterator', () => Iterators.mutableIterator())
            .on('cycle', (e) => {
            console.log(String(e.target));
        })
            // .on('complete', function (this: any) {
            //     console.log('Fastest is ' + this.filter('fastest').map('name'));
            // })
            .run();
    }
    Iterators.run = run;
})(Iterators || (Iterators = {}));
const it = It.Array([1, 2, 3]);
while (it.hasNext) {
    console.log(it.move());
}
