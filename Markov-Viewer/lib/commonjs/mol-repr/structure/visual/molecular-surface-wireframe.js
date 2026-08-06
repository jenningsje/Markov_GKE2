"use strict";
/**
 * Copyright (c) 2019-2025 mol* contributors, licensed under MIT, See LICENSE file for more info.
 *
 * @author Alexander Rose <alexander.rose@weirdbyte.de>
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.MolecularSurfaceWireframeParams = void 0;
exports.MolecularSurfaceWireframeVisual = MolecularSurfaceWireframeVisual;
const param_definition_1 = require("../../../mol-util/param-definition.js");
const units_visual_1 = require("../units-visual.js");
const lines_1 = require("../../../mol-geo/geometry/lines/lines.js");
const molecular_surface_1 = require("./util/molecular-surface.js");
const algorithm_1 = require("../../../mol-geo/util/marching-cubes/algorithm.js");
const element_1 = require("./util/element.js");
const common_1 = require("./util/common.js");
const geometry_1 = require("../../../mol-math/geometry.js");
const tensor_1 = require("../../../mol-math/linear-algebra/tensor.js");
exports.MolecularSurfaceWireframeParams = {
    ...units_visual_1.UnitsLinesParams,
    ...molecular_surface_1.CommonMolecularSurfaceCalculationParams,
    ...common_1.CommonSurfaceParams,
    sizeFactor: param_definition_1.ParamDefinition.Numeric(1.5, { min: 0, max: 10, step: 0.1 }),
};
//
async function createMolecularSurfaceWireframe(ctx, unit, structure, theme, props, lines) {
    const { transform, field, idField, maxRadius } = await (0, molecular_surface_1.computeUnitMolecularSurface)(structure, unit, theme.size, props).runInContext(ctx.runtime);
    const params = {
        isoLevel: props.probeRadius,
        scalarField: props.floodfill !== 'off' ? tensor_1.Tensor.createFloodfilled(field, props.probeRadius, props.floodfill) : field,
        idField
    };
    const wireframe = await (0, algorithm_1.computeMarchingCubesLines)(params, lines).runAsChild(ctx.runtime);
    lines_1.Lines.transform(wireframe, transform);
    const sphere = geometry_1.Sphere3D.expand((0, geometry_1.Sphere3D)(), unit.boundary.sphere, maxRadius);
    wireframe.setBoundingSphere(sphere);
    return wireframe;
}
function MolecularSurfaceWireframeVisual(materialId) {
    return (0, units_visual_1.UnitsLinesVisual)({
        defaultProps: param_definition_1.ParamDefinition.getDefaultValues(exports.MolecularSurfaceWireframeParams),
        createGeometry: createMolecularSurfaceWireframe,
        createLocationIterator: element_1.ElementIterator.fromGroup,
        getLoci: element_1.getElementLoci,
        eachLocation: element_1.eachElement,
        setUpdateState: (state, newProps, currentProps) => {
            state.createGeometry = (newProps.resolution !== currentProps.resolution ||
                newProps.probeRadius !== currentProps.probeRadius ||
                newProps.probePositions !== currentProps.probePositions ||
                newProps.ignoreHydrogens !== currentProps.ignoreHydrogens ||
                newProps.ignoreHydrogensVariant !== currentProps.ignoreHydrogensVariant ||
                newProps.includeParent !== currentProps.includeParent ||
                newProps.floodfill !== currentProps.floodfill);
        }
    }, materialId);
}
