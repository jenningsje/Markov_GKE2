/**
 * Copyright (c) 2019-2024 mol* contributors, licensed under MIT, See LICENSE file for more info.
 *
 * @author Alexander Rose <alexander.rose@weirdbyte.de>
 */
import './index.html';
import { resizeCanvas } from '../../mol-canvas3d/util.js';
import { Canvas3D, Canvas3DContext } from '../../mol-canvas3d/canvas3d.js';
import { LinesBuilder } from '../../mol-geo/geometry/lines/lines-builder.js';
import { Mat4 } from '../../mol-math/linear-algebra.js';
import { DodecahedronCage } from '../../mol-geo/primitive/dodecahedron.js';
import { Lines } from '../../mol-geo/geometry/lines/lines.js';
import { Color } from '../../mol-util/color/index.js';
import { createRenderObject } from '../../mol-gl/render-object.js';
import { Representation } from '../../mol-repr/representation.js';
import { ParamDefinition } from '../../mol-util/param-definition.js';
import { AssetManager } from '../../mol-util/assets.js';
const parent = document.getElementById('app');
parent.style.width = '100%';
parent.style.height = '100%';
const canvas = document.createElement('canvas');
parent.appendChild(canvas);
const assetManager = new AssetManager();
const canvas3dContext = Canvas3DContext.fromCanvas(canvas, assetManager);
const canvas3d = Canvas3D.create(canvas3dContext);
resizeCanvas(canvas, parent, canvas3dContext.pixelScale);
canvas3dContext.syncPixelScale();
canvas3d.requestResize();
canvas3d.animate();
canvas3d.input.resize.subscribe(() => {
    resizeCanvas(canvas, parent, canvas3dContext.pixelScale);
    canvas3dContext.syncPixelScale();
    canvas3d.requestResize();
});
function linesRepr() {
    const linesBuilder = LinesBuilder.create();
    const t = Mat4.identity();
    const dodecahedronCage = DodecahedronCage();
    linesBuilder.addCage(t, dodecahedronCage, 0);
    const lines = linesBuilder.getLines();
    const props = ParamDefinition.getDefaultValues(Lines.Utils.Params);
    const values = Lines.Utils.createValuesSimple(lines, props, Color(0xFF0000), 3);
    const state = Lines.Utils.createRenderableState(props);
    const renderObject = createRenderObject('lines', values, state, -1);
    const repr = Representation.fromRenderObject('cage-lines', renderObject);
    return repr;
}
canvas3d.add(linesRepr());
canvas3d.requestCameraReset();
