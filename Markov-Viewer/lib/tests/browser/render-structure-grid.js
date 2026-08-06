/**
 * Copyright (c) 2024 mol* contributors, licensed under MIT, See LICENSE file for more info.
 *
 * @author Herman Bergwerf <post@hbergwerf.nl>
 * @author Alexander Rose <alexander.rose@weirdbyte.de>
 */
import { AssetManager } from '../../mol-util/assets.js';
import { Canvas3D, Canvas3DContext } from '../../mol-canvas3d/canvas3d.js';
import { resizeCanvas } from '../../mol-canvas3d/util.js';
import { parseSdf as _parseSdf } from '../../mol-io/reader/sdf/parser.js';
import { Structure } from '../../mol-model/structure.js';
import { trajectoryFromSdf } from '../../mol-model-formats/structure/sdf.js';
import { ColorTheme } from '../../mol-theme/color.js';
import { SizeTheme } from '../../mol-theme/size.js';
import { BallAndStickRepresentationProvider } from '../../mol-repr/structure/representation/ball-and-stick.js';
async function downloadPubChemSdf(cid) {
    const root = 'https://pubchem.ncbi.nlm.nih.gov/rest';
    const r = await fetch(`${root}/pug/compound/cid/${cid}/sdf?record_type=3d`);
    return await r.text();
}
async function parseSdf(sdf) {
    const parsed = await _parseSdf(sdf).run();
    if (parsed.isError) {
        throw parsed;
    }
    else {
        return parsed.result;
    }
}
function getRepr(provider, reprCtx) {
    return provider.factory(reprCtx, provider.getParams);
}
function main() {
    const parent = document.body;
    const canvas = document.createElement('canvas');
    parent.appendChild(canvas);
    const canvas3ds = [];
    const canvas3dContext = Canvas3DContext.fromCanvas(canvas, new AssetManager());
    resizeCanvas(canvas, parent, canvas3dContext.pixelScale);
    canvas3dContext.syncPixelScale();
    canvas3dContext.input.resize.subscribe(() => {
        resizeCanvas(canvas, parent, canvas3dContext.pixelScale);
        canvas3dContext.syncPixelScale();
        for (const canvas3d of canvas3ds)
            canvas3d.requestResize();
    });
    const cids = [
        6440397,
        2244,
        2519,
        241
    ];
    const reprCtx = {
        webgl: canvas3dContext.webgl,
        colorThemeRegistry: ColorTheme.createRegistry(),
        sizeThemeRegistry: SizeTheme.createRegistry()
    };
    for (let i = 0; i < cids.length; i++) {
        const ix = i % 2;
        const iy = Math.floor(i / 2);
        addViewer(canvas3dContext, reprCtx, cids[i], {
            name: 'relative-frame',
            params: {
                x: ix / 2,
                y: iy / 2,
                width: 0.5,
                height: 0.5,
            }
        }, {
            adjustCylinderLength: ix === 0
        }).then(canvas3d => {
            canvas3ds.push(canvas3d);
        });
    }
}
async function addViewer(ctx, reprCtx, cid, viewport, reprValues) {
    const file = await parseSdf(await downloadPubChemSdf(cid));
    const models = await trajectoryFromSdf(file.compounds[0]).run();
    const structure = Structure.ofModel(models.representative);
    const canvas3d = Canvas3D.create(ctx, { viewport });
    canvas3d.requestResize();
    const repr = getRepr(BallAndStickRepresentationProvider, reprCtx);
    repr.setTheme({
        color: reprCtx.colorThemeRegistry.create('element-symbol', { structure }, {
            carbonColor: { name: 'element-symbol' }
        }),
        size: reprCtx.sizeThemeRegistry.create('physical', { structure })
    });
    await repr.createOrUpdate({
        ...BallAndStickRepresentationProvider.defaultValues,
        ...reprValues
    }, structure).run();
    canvas3d.add(repr);
    canvas3d.animate();
    return canvas3d;
}
main();
