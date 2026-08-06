import * as B from 'benchmark';
import { now } from '../mol-util/now.js';
import { Scheduler } from '../mol-task/util/scheduler.js';
export var Tasks;
(function (Tasks) {
    class Yielding {
        constructor() {
            this.lastUpdated = 0;
        }
        yield() {
            const t = now();
            if (t - this.lastUpdated < 250)
                return;
            this.lastUpdated = t;
            return Scheduler.immediatePromise();
        }
    }
    Tasks.Yielding = Yielding;
    class CheckYielding {
        constructor() {
            this.lastUpdated = 0;
        }
        get needsYield() {
            return now() - this.lastUpdated > 250;
        }
        yield() {
            this.lastUpdated = now();
            return Scheduler.immediatePromise();
        }
    }
    Tasks.CheckYielding = CheckYielding;
    async function yielding() {
        console.time('yielding');
        const y = new Yielding();
        let ret = 0;
        for (let i = 0; i < 1000000; i++) {
            ret += +(i.toString() + i.toString());
            if (i % 10000 === 0)
                await y.yield();
        }
        console.timeEnd('yielding');
        console.log(ret);
        return ret;
    }
    Tasks.yielding = yielding;
    async function yielding1() {
        console.time('yielding1');
        const y = new Yielding();
        let ret = 0;
        let yy;
        for (let i = 0; i < 1000000; i++) {
            ret += +(i.toString() + i.toString());
            if (i % 10000 === 0 && (yy = y.yield()))
                await yy;
        }
        console.timeEnd('yielding1');
        console.log(ret);
        return ret;
    }
    Tasks.yielding1 = yielding1;
    async function testYielding() {
        console.time('check yielding');
        const y = new CheckYielding();
        let ret = 0;
        for (let i = 0; i < 1000000; i++) {
            ret += +(i.toString() + i.toString());
            if (i % 10000 === 0 && y.needsYield)
                await y.yield();
        }
        console.timeEnd('check yielding');
        console.log(ret);
        return ret;
    }
    Tasks.testYielding = testYielding;
    async function baseline() {
        console.time('baseline');
        let ret = 0;
        for (let i = 0; i < 1000000; i++) {
            ret += +(i.toString() + i.toString());
        }
        console.timeEnd('baseline');
        console.log(ret);
        return ret;
    }
    Tasks.baseline = baseline;
    async function testImmediate() {
        console.time('immediate');
        const ret = 0;
        const y = new CheckYielding();
        for (let i = 0; i < 1000000; i++) {
            // ret += +(i.toString() + i.toString());
            if (i % 10000 === 0)
                await y.yield();
        }
        console.timeEnd('immediate');
        console.log(ret);
        return ret;
    }
    Tasks.testImmediate = testImmediate;
    function run() {
        const suite = new B.Suite();
        suite
            .add(`yielding`, async () => { return await yielding(); })
            // .add(`test yielding`, () => testYielding().then(() => { }))
            .on('cycle', (e) => console.log(String(e.target)))
            .run();
    }
    Tasks.run = run;
    function add(x, y) {
        return x + y;
    }
    // async function addAs(x: number, y: number) {
    //     return x + y;
    // }
    async function opAsync(n) {
        let ret = 0;
        for (let i = 0; i < n; i++) {
            const v = add(i, i + 1);
            ret += v.then ? await v : v;
        }
        return ret;
    }
    function opNormal(n) {
        let ret = 0;
        for (let i = 0; i < n; i++) {
            ret += add(i, i + 1);
        }
        return ret;
    }
    async function awaitF() {
        const N = 10000000;
        console.time('async');
        console.log(await opAsync(N));
        console.timeEnd('async');
        console.time('async');
        console.log(await opAsync(N));
        console.timeEnd('async');
        console.time('async');
        console.log(await opAsync(N));
        console.timeEnd('async');
        console.time('normal');
        console.log(opNormal(N));
        console.timeEnd('normal');
        console.time('normal');
        console.log(opNormal(N));
        console.timeEnd('normal');
        console.time('normal');
        console.log(opNormal(N));
        console.timeEnd('normal');
        // const suite = new B.Suite();
        // suite
        //     .add(`async`, async () => { return await opAsync(100000); })
        //     .add(`normal`, () => { return opNormal(100000); })
        //     .on('cycle', (e: any) => console.log(String(e.target)))
        //     .run();
    }
    Tasks.awaitF = awaitF;
})(Tasks || (Tasks = {}));
(async function () {
    // await Tasks.testImmediate();
    // await Tasks.testImmediate();
    // await Tasks.baseline();
    // await Tasks.yielding();
    // await Tasks.yielding1();
    // await Tasks.testYielding();
    // await Tasks.baseline();
    // await Tasks.yielding();
    // await Tasks.yielding1();
    // await Tasks.testYielding();
    await Tasks.awaitF();
}());
// console.time('test')
// Tasks.yielding();
// console.timeEnd('test')
// console.time('test')
// Tasks.yielding();
// console.timeEnd('test')
// console.time('test')
// Tasks.testYielding();
// console.timeEnd('test')
// console.time('test')
// Tasks.testYielding();
// console.timeEnd('test')
