"use strict";
/**
 * Copyright (c) 2019-2025 mol* contributors, licensed under MIT, See LICENSE file for more info.
 *
 * @author Alexander Rose <alexander.rose@weirdbyte.de>
 */
Object.defineProperty(exports, "__esModule", { value: true });
require("./index.html");
const canvas3d_1 = require("../../mol-canvas3d/canvas3d.js");
const cif_1 = require("../../mol-io/reader/cif.js");
const structure_1 = require("../../mol-model/structure.js");
const color_1 = require("../../mol-theme/color.js");
const size_1 = require("../../mol-theme/size.js");
const cartoon_1 = require("../../mol-repr/structure/representation/cartoon.js");
const mmcif_1 = require("../../mol-model-formats/structure/mmcif.js");
const molecular_surface_1 = require("../../mol-repr/structure/representation/molecular-surface.js");
const ball_and_stick_1 = require("../../mol-repr/structure/representation/ball-and-stick.js");
const gaussian_surface_1 = require("../../mol-repr/structure/representation/gaussian-surface.js");
const util_1 = require("../../mol-canvas3d/util.js");
const representation_1 = require("../../mol-repr/representation.js");
const operators_1 = require("rxjs/operators");
const marker_action_1 = require("../../mol-util/marker-action.js");
const loci_1 = require("../../mol-model/loci.js");
const label_1 = require("../../mol-theme/label.js");
const interactions_1 = require("../../mol-model-props/computed/representations/interactions.js");
const interactions_2 = require("../../mol-model-props/computed/interactions.js");
const secondary_structure_1 = require("../../mol-model-props/computed/secondary-structure.js");
const synchronous_1 = require("../../mol-task/execution/synchronous.js");
const assets_1 = require("../../mol-util/assets.js");
const prop_1 = require("../../extensions/anvil/prop.js");
const representation_2 = require("../../extensions/anvil/representation.js");
const vec2_1 = require("../../mol-math/linear-algebra/3d/vec2.js");
const parent = document.getElementById('app');
parent.style.width = '100%';
parent.style.height = '100%';
const canvas = document.createElement('canvas');
parent.appendChild(canvas);
const assetManager = new assets_1.AssetManager();
const canvas3dContext = canvas3d_1.Canvas3DContext.fromCanvas(canvas, assetManager);
const canvas3d = canvas3d_1.Canvas3D.create(canvas3dContext);
(0, util_1.resizeCanvas)(canvas, parent, canvas3dContext.pixelScale);
canvas3dContext.syncPixelScale();
canvas3d.requestResize();
canvas3d.animate();
const xrButton = document.createElement('button');
Object.assign(xrButton.style, {
    bottom: '30px',
    left: '50%',
    transform: 'translateX(-50%)',
    background: 'grey',
    zIndex: 1000,
    position: 'absolute',
    mixBlendMode: 'luminosity',
    color: 'white',
    border: 'white 2px solid',
    padding: '6px',
    display: 'none',
});
parent.appendChild(xrButton);
xrButton.onclick = () => {
    if (canvas3d.xr.isPresenting.value) {
        canvas3d.xr.end();
    }
    else {
        canvas3d.xr.request();
    }
};
canvas3d.xr.isPresenting.subscribe(value => {
    xrButton.textContent = value ? 'Exit XR' : 'Enter XR';
});
canvas3d.xr.isSupported.subscribe(value => {
    xrButton.style.display = value ? 'block' : 'none';
});
const info = document.createElement('div');
info.style.position = 'absolute';
info.style.fontFamily = 'sans-serif';
info.style.fontSize = '16pt';
info.style.bottom = '20px';
info.style.right = '20px';
info.style.color = 'white';
parent.appendChild(info);
let prevReprLoci = representation_1.Representation.Loci.Empty;
canvas3d.input.move.pipe((0, operators_1.throttleTime)(100)).subscribe(({ x, y }) => {
    var _a;
    const pickingId = (_a = canvas3d.identify(vec2_1.Vec2.create(x, y))) === null || _a === void 0 ? void 0 : _a.id;
    let label = '';
    if (pickingId) {
        const reprLoci = canvas3d.getLoci(pickingId);
        label = (0, label_1.lociLabel)(reprLoci.loci);
        if (!representation_1.Representation.Loci.areEqual(prevReprLoci, reprLoci)) {
            canvas3d.mark(prevReprLoci, marker_action_1.MarkerAction.RemoveHighlight);
            canvas3d.mark(reprLoci, marker_action_1.MarkerAction.Highlight);
            prevReprLoci = reprLoci;
        }
    }
    else {
        canvas3d.mark({ loci: loci_1.EveryLoci }, marker_action_1.MarkerAction.RemoveHighlight);
        prevReprLoci = representation_1.Representation.Loci.Empty;
    }
    info.innerHTML = label;
});
canvas3d.input.resize.subscribe(() => {
    (0, util_1.resizeCanvas)(canvas, parent, canvas3dContext.pixelScale);
    canvas3dContext.syncPixelScale();
    canvas3d.requestResize();
});
async function parseCif(data) {
    const comp = cif_1.CIF.parse(data);
    const parsed = await comp.run();
    if (parsed.isError)
        throw parsed;
    return parsed.result;
}
async function downloadCif(url, isBinary) {
    const data = await fetch(url);
    return parseCif(isBinary ? new Uint8Array(await data.arrayBuffer()) : await data.text());
}
async function downloadFromPdb(pdb) {
    const parsed = await downloadCif(`https://models.rcsb.org/${pdb}.bcif`, true);
    return parsed.blocks[0];
}
async function getModels(frame) {
    return await (0, mmcif_1.trajectoryFromMmCIF)(frame).run();
}
async function getStructure(model) {
    return structure_1.Structure.ofModel(model);
}
const reprCtx = {
    webgl: canvas3d.webgl,
    colorThemeRegistry: color_1.ColorTheme.createRegistry(),
    sizeThemeRegistry: size_1.SizeTheme.createRegistry()
};
function getCartoonRepr() {
    return cartoon_1.CartoonRepresentationProvider.factory(reprCtx, cartoon_1.CartoonRepresentationProvider.getParams);
}
function getInteractionRepr() {
    return interactions_1.InteractionsRepresentationProvider.factory(reprCtx, interactions_1.InteractionsRepresentationProvider.getParams);
}
function getBallAndStickRepr() {
    return ball_and_stick_1.BallAndStickRepresentationProvider.factory(reprCtx, ball_and_stick_1.BallAndStickRepresentationProvider.getParams);
}
function getMolecularSurfaceRepr() {
    return molecular_surface_1.MolecularSurfaceRepresentationProvider.factory(reprCtx, molecular_surface_1.MolecularSurfaceRepresentationProvider.getParams);
}
function getGaussianSurfaceRepr() {
    return gaussian_surface_1.GaussianSurfaceRepresentationProvider.factory(reprCtx, gaussian_surface_1.GaussianSurfaceRepresentationProvider.getParams);
}
function getMembraneOrientationRepr() {
    return representation_2.MembraneOrientationRepresentationProvider.factory(reprCtx, representation_2.MembraneOrientationRepresentationProvider.getParams);
}
async function init() {
    const ctx = { runtime: synchronous_1.SyncRuntimeContext, assetManager };
    const cif = await downloadFromPdb('3pqr');
    const models = await getModels(cif);
    const structure = await getStructure(models.representative);
    console.time('compute SecondaryStructure');
    await secondary_structure_1.SecondaryStructureProvider.attach(ctx, structure);
    console.timeEnd('compute SecondaryStructure');
    console.time('compute Membrane Orientation');
    await prop_1.MembraneOrientationProvider.attach(ctx, structure);
    console.timeEnd('compute Membrane Orientation');
    console.time('compute Interactions');
    await interactions_2.InteractionsProvider.attach(ctx, structure);
    console.timeEnd('compute Interactions');
    console.log(interactions_2.InteractionsProvider.get(structure).value);
    const show = {
        cartoon: true,
        interaction: true,
        ballAndStick: true,
        molecularSurface: false,
        gaussianSurface: false,
        membrane: true
    };
    const cartoonRepr = getCartoonRepr();
    const interactionRepr = getInteractionRepr();
    const ballAndStickRepr = getBallAndStickRepr();
    const molecularSurfaceRepr = getMolecularSurfaceRepr();
    const gaussianSurfaceRepr = getGaussianSurfaceRepr();
    const membraneOrientationRepr = getMembraneOrientationRepr();
    if (show.cartoon) {
        cartoonRepr.setTheme({
            color: reprCtx.colorThemeRegistry.create('element-symbol', { structure }),
            size: reprCtx.sizeThemeRegistry.create('uniform', { structure })
        });
        await cartoonRepr.createOrUpdate({ ...cartoon_1.CartoonRepresentationProvider.defaultValues, quality: 'auto' }, structure).run();
    }
    if (show.interaction) {
        interactionRepr.setTheme({
            color: reprCtx.colorThemeRegistry.create('interaction-type', { structure }),
            size: reprCtx.sizeThemeRegistry.create('uniform', { structure })
        });
        await interactionRepr.createOrUpdate({ ...interactions_1.InteractionsRepresentationProvider.defaultValues, quality: 'auto' }, structure).run();
    }
    if (show.ballAndStick) {
        ballAndStickRepr.setTheme({
            color: reprCtx.colorThemeRegistry.create('element-symbol', { structure }),
            size: reprCtx.sizeThemeRegistry.create('uniform', { structure }, { value: 1 })
        });
        await ballAndStickRepr.createOrUpdate({ ...ball_and_stick_1.BallAndStickRepresentationProvider.defaultValues, quality: 'auto' }, structure).run();
    }
    if (show.molecularSurface) {
        molecularSurfaceRepr.setTheme({
            color: reprCtx.colorThemeRegistry.create('secondary-structure', { structure }),
            size: reprCtx.sizeThemeRegistry.create('physical', { structure })
        });
        console.time('molecular surface');
        await molecularSurfaceRepr.createOrUpdate({ ...molecular_surface_1.MolecularSurfaceRepresentationProvider.defaultValues, quality: 'custom', alpha: 0.5, flatShaded: true, doubleSided: true, resolution: 0.3 }, structure).run();
        console.timeEnd('molecular surface');
    }
    if (show.gaussianSurface) {
        gaussianSurfaceRepr.setTheme({
            color: reprCtx.colorThemeRegistry.create('secondary-structure', { structure }),
            size: reprCtx.sizeThemeRegistry.create('physical', { structure })
        });
        console.time('gaussian surface');
        await gaussianSurfaceRepr.createOrUpdate({ ...gaussian_surface_1.GaussianSurfaceRepresentationProvider.defaultValues, quality: 'custom', alpha: 1.0, flatShaded: true, doubleSided: true, resolution: 0.3 }, structure).run();
        console.timeEnd('gaussian surface');
    }
    if (show.membrane) {
        await membraneOrientationRepr.createOrUpdate({ ...representation_2.MembraneOrientationRepresentationProvider.defaultValues, quality: 'auto' }, structure).run();
    }
    if (show.cartoon)
        canvas3d.add(cartoonRepr);
    if (show.interaction)
        canvas3d.add(interactionRepr);
    if (show.ballAndStick)
        canvas3d.add(ballAndStickRepr);
    if (show.molecularSurface)
        canvas3d.add(molecularSurfaceRepr);
    if (show.gaussianSurface)
        canvas3d.add(gaussianSurfaceRepr);
    if (show.membrane)
        canvas3d.add(membraneOrientationRepr);
    canvas3d.requestCameraReset();
    // canvas3d.setProps({ trackball: { ...canvas3d.props.trackball, spin: true } })
}
init();
