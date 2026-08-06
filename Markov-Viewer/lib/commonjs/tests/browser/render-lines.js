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
const lines_builder_1 = require("../../mol-geo/geometry/lines/lines-builder.js");
const linear_algebra_1 = require("../../mol-math/linear-algebra.js");
const dodecahedron_1 = require("../../mol-geo/primitive/dodecahedron.js");
const lines_1 = require("../../mol-geo/geometry/lines/lines.js");
const color_1 = require("../../mol-util/color/index.js");
const render_object_1 = require("../../mol-gl/render-object.js");
const representation_1 = require("../../mol-repr/representation.js");
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
function linesRepr() {
    const linesBuilder = lines_builder_1.LinesBuilder.create();
    const t = linear_algebra_1.Mat4.identity();
    const dodecahedronCage = (0, dodecahedron_1.DodecahedronCage)();
    linesBuilder.addCage(t, dodecahedronCage, 0);
    const lines = linesBuilder.getLines();
    const props = param_definition_1.ParamDefinition.getDefaultValues(lines_1.Lines.Utils.Params);
    const values = lines_1.Lines.Utils.createValuesSimple(lines, props, (0, color_1.Color)(0xFF0000), 3);
    const state = lines_1.Lines.Utils.createRenderableState(props);
    const renderObject = (0, render_object_1.createRenderObject)('lines', values, state, -1);
    const repr = representation_1.Representation.fromRenderObject('cage-lines', renderObject);
    return repr;
}
canvas3d.add(linesRepr());
canvas3d.requestCameraReset();
