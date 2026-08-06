"use strict";
/**
 * Copyright (c) 2019-2025 mol* contributors, licensed under MIT, See LICENSE file for more info.
 *
 * @author Alexander Rose <alexander.rose@weirdbyte.de>
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.init = init;
require("./index.html");
const util_1 = require("../../mol-canvas3d/util.js");
const representation_1 = require("../../mol-repr/representation.js");
const canvas3d_1 = require("../../mol-canvas3d/canvas3d.js");
const label_1 = require("../../mol-theme/label.js");
const marker_action_1 = require("../../mol-util/marker-action.js");
const loci_1 = require("../../mol-model/loci.js");
const mol_task_1 = require("../../mol-task/index.js");
const mesh_1 = require("../../mol-geo/geometry/mesh/mesh.js");
const mesh_builder_1 = require("../../mol-geo/geometry/mesh/mesh-builder.js");
const linear_algebra_1 = require("../../mol-math/linear-algebra.js");
const sphere_1 = require("../../mol-geo/primitive/sphere.js");
const names_1 = require("../../mol-util/color/names.js");
const shape_1 = require("../../mol-model/shape.js");
const representation_2 = require("../../mol-repr/shape/representation.js");
const assets_1 = require("../../mol-util/assets.js");
const spheres_1 = require("../../mol-geo/geometry/spheres/spheres.js");
const spheres_builder_1 = require("../../mol-geo/geometry/spheres/spheres-builder.js");
const parent = document.getElementById('app');
parent.style.width = '100%';
parent.style.height = '100%';
const canvas = document.createElement('canvas');
parent.appendChild(canvas);
(0, util_1.resizeCanvas)(canvas, parent);
const assetManager = new assets_1.AssetManager();
const canvas3dContext = canvas3d_1.Canvas3DContext.fromCanvas(canvas, assetManager);
const canvas3d = canvas3d_1.Canvas3D.create(canvas3dContext);
(0, util_1.resizeCanvas)(canvas, parent, canvas3dContext.pixelScale);
canvas3dContext.syncPixelScale();
canvas3d.requestResize();
canvas3d.animate();
const info = document.createElement('div');
info.style.position = 'absolute';
info.style.fontFamily = 'sans-serif';
info.style.fontSize = '24pt';
info.style.bottom = '20px';
info.style.right = '20px';
info.style.color = 'white';
parent.appendChild(info);
let prevReprLoci = representation_1.Representation.Loci.Empty;
canvas3d.input.move.subscribe(({ x, y }) => {
    var _a;
    const pickingId = (_a = canvas3d.identify(linear_algebra_1.Vec2.create(x, y))) === null || _a === void 0 ? void 0 : _a.id;
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
    info.innerText = label;
});
canvas3d.input.resize.subscribe(() => {
    (0, util_1.resizeCanvas)(canvas, parent, canvas3dContext.pixelScale);
    canvas3dContext.syncPixelScale();
    canvas3d.requestResize();
});
const commonData = {
    // version, increment to trigger update
    version: 0,
    // centers of spheres
    centers: [
        0, 0, 0,
        0, 3, 0,
        1, 0, 4
    ],
    // color per group
    colors: [names_1.ColorNames.tomato, names_1.ColorNames.springgreen, names_1.ColorNames.springgreen],
    // size per group
    sizes: [1, 0.5, 0.2],
    // labels per group and instance
    labels: [
        'Sphere 0, Instance A',
        'Sphere 1, Instance A',
        'Sphere 2, Instance A',
        'Sphere 0, Instance B',
        'Sphere 1, Instance B',
        'Sphere 2, Instance B',
    ],
    // transforms
    transforms: [
        linear_algebra_1.Mat4.identity(),
        linear_algebra_1.Mat4.fromTranslation((0, linear_algebra_1.Mat4)(), linear_algebra_1.Vec3.create(3, 0, 0))
    ],
};
const meshData = {
    ...commonData,
    props: {
        sphereDetail: 3,
    },
};
const spheresData = {
    ...commonData,
};
/**
 * Create a mesh of spheres at given centers
 * - asynchronous (using async/await)
 * - progress tracking (via `ctx.update`)
 * - re-use storage from an existing mesh if given
 */
async function getSphereMesh(ctx, data, props, mesh) {
    console.log('getSphereMesh');
    const { centers, sizes } = data;
    const builderState = mesh_builder_1.MeshBuilder.createState(centers.length / 3, centers.length / 3, mesh);
    const t = linear_algebra_1.Mat4.identity();
    const v = (0, linear_algebra_1.Vec3)();
    const sphere = (0, sphere_1.Sphere)(data.props.sphereDetail);
    builderState.currentGroup = 0;
    for (let i = 0, il = centers.length / 3; i < il; ++i) {
        // for production, calls to update should be guarded by `if (ctx.shouldUpdate)`
        await ctx.update({ current: i, max: il, message: `adding mesh sphere ${i}` });
        builderState.currentGroup = i;
        linear_algebra_1.Mat4.setIdentity(t);
        linear_algebra_1.Mat4.scaleUniformly(t, t, sizes[i]);
        linear_algebra_1.Mat4.setTranslation(t, linear_algebra_1.Vec3.fromArray(v, centers, i * 3));
        mesh_builder_1.MeshBuilder.addPrimitive(builderState, t, sphere);
    }
    return mesh_builder_1.MeshBuilder.getMesh(builderState);
}
async function getSpheres(ctx, data, props, spheres) {
    console.log('getSpheres');
    const { centers } = data;
    const builder = spheres_builder_1.SpheresBuilder.create(centers.length / 3, centers.length / 3, spheres);
    for (let i = 0, il = centers.length / 3; i < il; ++i) {
        // for production, calls to update should be guarded by `if (ctx.shouldUpdate)`
        await ctx.update({ current: i, max: il, message: `adding sphere ${i}` });
        builder.add(centers[i * 3], centers[i * 3 + 1], centers[i * 3 + 2], i);
    }
    return builder.getSpheres();
}
/**
 * Get mesh shape from `MyData` object
 */
async function getMeshShape(ctx, data, props, shape) {
    const currentData = shape ? shape.sourceData : undefined;
    if (shape && (currentData === null || currentData === void 0 ? void 0 : currentData.version) === data.version) {
        return shape;
    }
    await ctx.update('async creation of mesh shape from myData');
    const { centers, colors, sizes, labels, transforms } = data;
    const mesh = await getSphereMesh(ctx, data, props, shape && shape.geometry);
    const groupCount = centers.length / 3;
    return shape_1.Shape.create('test', { ...data }, mesh, (groupId) => colors[groupId], // color: per group, same for instances
    (groupId) => sizes[groupId], // size: per group, same for instances
    (groupId, instanceId) => labels[instanceId * groupCount + groupId], // label: per group and instance
    transforms);
}
/**
 * Get spheres shape from `MyData` object
 */
async function getSpheresShape(ctx, data, props, shape) {
    const currentData = shape ? shape.sourceData : undefined;
    if (shape && (currentData === null || currentData === void 0 ? void 0 : currentData.version) === data.version) {
        return shape;
    }
    await ctx.update('async creation of spheres shape from myData');
    const { centers, colors, sizes, labels, transforms } = data;
    const mesh = await getSpheres(ctx, data, props, shape && shape.geometry);
    const groupCount = centers.length / 3;
    return shape_1.Shape.create('test', { ...data }, mesh, (groupId) => colors[groupId], // color: per group, same for instances
    (groupId) => sizes[groupId] / 3, // size: per group, same for instances
    (groupId, instanceId) => labels[instanceId * groupCount + groupId], // label: per group and instance
    transforms);
}
// Init ShapeRepresentation containers
const meshRepr = (0, representation_2.ShapeRepresentation)(getMeshShape, mesh_1.Mesh.Utils);
const spheresRepr = (0, representation_2.ShapeRepresentation)(getSpheresShape, spheres_1.Spheres.Utils);
async function changeMeshColor() {
    meshData.colors[0] = names_1.ColorNames.darkmagenta;
    // Calling `createOrUpdate` with `data` will trigger color and transform update
    await meshRepr.createOrUpdate({}, meshData).run();
}
async function changeMeshDetail() {
    meshData.version += 1; // to trigger geometry update
    meshData.props.sphereDetail = (meshData.props.sphereDetail + 1) % 4;
    await meshRepr.createOrUpdate({}, meshData).run();
    setTimeout(changeMeshDetail, 500);
}
async function toggleSpheresVisibility() {
    spheresRepr.setState({ visible: !spheresRepr.state.visible });
    setTimeout(toggleSpheresVisibility, 1000);
}
async function init() {
    // Create shape from meshData and add to canvas3d
    await meshRepr.createOrUpdate({ alpha: 0.5 }, meshData).run((p) => console.log(mol_task_1.Progress.format(p)));
    console.log('mesh shape', meshRepr);
    canvas3d.add(meshRepr);
    // Create shape from spheresData and add to canvas3d
    await spheresRepr.createOrUpdate({}, spheresData).run((p) => console.log(mol_task_1.Progress.format(p)));
    console.log('spheres shape', spheresRepr);
    canvas3d.add(spheresRepr);
    canvas3d.requestCameraReset();
    // Change color after 1s
    setTimeout(changeMeshColor, 1000);
    // Start changing mesh sphereDetail after 1s
    setTimeout(changeMeshDetail, 1000);
    // Start toggling spheres visibility after 1s
    setTimeout(toggleSpheresVisibility, 1000);
}
init();
