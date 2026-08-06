"use strict";
/**
 * Copyright (c) 2019-2024 mol* contributors, licensed under MIT, See LICENSE file for more info.
 *
 * @author Alexander Rose <alexander.rose@weirdbyte.de>
 */
Object.defineProperty(exports, "__esModule", { value: true });
require("./index.html");
const util_1 = require("../../mol-canvas3d/util.js");
const canvas3d_1 = require("../../mol-canvas3d/canvas3d.js");
const mesh_builder_1 = require("../../mol-geo/geometry/mesh/mesh-builder.js");
const linear_algebra_1 = require("../../mol-math/linear-algebra.js");
const prism_1 = require("../../mol-geo/primitive/prism.js");
const spiked_ball_1 = require("../../mol-geo/primitive/spiked-ball.js");
const mesh_1 = require("../../mol-geo/geometry/mesh/mesh.js");
const color_1 = require("../../mol-util/color/index.js");
const render_object_1 = require("../../mol-gl/render-object.js");
const representation_1 = require("../../mol-repr/representation.js");
const torus_1 = require("../../mol-geo/primitive/torus.js");
const param_definition_1 = require("../../mol-util/param-definition.js");
const assets_1 = require("../../mol-util/assets.js");
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
canvas3d.input.resize.subscribe(() => {
    (0, util_1.resizeCanvas)(canvas, parent, canvas3dContext.pixelScale);
    canvas3dContext.syncPixelScale();
    canvas3d.requestResize();
});
function meshRepr() {
    const builderState = mesh_builder_1.MeshBuilder.createState();
    const t = linear_algebra_1.Mat4.identity();
    linear_algebra_1.Mat4.scaleUniformly(t, t, 10);
    mesh_builder_1.MeshBuilder.addCage(builderState, t, (0, prism_1.HexagonalPrismCage)(), 0.05, 2, 20);
    const t2 = linear_algebra_1.Mat4.identity();
    linear_algebra_1.Mat4.scaleUniformly(t2, t2, 1);
    mesh_builder_1.MeshBuilder.addPrimitive(builderState, t2, (0, spiked_ball_1.SpikedBall)(3));
    const t3 = linear_algebra_1.Mat4.identity();
    linear_algebra_1.Mat4.scaleUniformly(t3, t3, 8);
    mesh_builder_1.MeshBuilder.addPrimitive(builderState, t3, (0, torus_1.Torus)({ tubularSegments: 64, radialSegments: 32, tube: 0.1 }));
    const mesh = mesh_builder_1.MeshBuilder.getMesh(builderState);
    const props = param_definition_1.ParamDefinition.getDefaultValues(mesh_1.Mesh.Utils.Params);
    const values = mesh_1.Mesh.Utils.createValuesSimple(mesh, props, (0, color_1.Color)(0xFF4433), 1);
    const state = mesh_1.Mesh.Utils.createRenderableState(props);
    const renderObject = (0, render_object_1.createRenderObject)('mesh', values, state, -1);
    console.log('mesh', renderObject);
    const repr = representation_1.Representation.fromRenderObject('mesh', renderObject);
    return repr;
}
canvas3d.add(meshRepr());
canvas3d.requestCameraReset();
