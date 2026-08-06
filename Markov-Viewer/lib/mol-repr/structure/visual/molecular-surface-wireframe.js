/**
 * Copyright (c) 2019-2025 mol* contributors, licensed under MIT, See LICENSE file for more info.
 *
 * @author Alexander Rose <alexander.rose@weirdbyte.de>
 */
import { ParamDefinition as PD } from '../../../mol-util/param-definition.js';
import { UnitsLinesVisual, UnitsLinesParams } from '../units-visual.js';
import { Lines } from '../../../mol-geo/geometry/lines/lines.js';
import { CommonMolecularSurfaceCalculationParams, computeUnitMolecularSurface } from './util/molecular-surface.js';
import { computeMarchingCubesLines } from '../../../mol-geo/util/marching-cubes/algorithm.js';
import { ElementIterator, getElementLoci, eachElement } from './util/element.js';
import { CommonSurfaceParams } from './util/common.js';
import { Sphere3D } from '../../../mol-math/geometry.js';
import { Tensor } from '../../../mol-math/linear-algebra/tensor.js';
export const MolecularSurfaceWireframeParams = {
    ...UnitsLinesParams,
    ...CommonMolecularSurfaceCalculationParams,
    ...CommonSurfaceParams,
    sizeFactor: PD.Numeric(1.5, { min: 0, max: 10, step: 0.1 }),
};
//
async function createMolecularSurfaceWireframe(ctx, unit, structure, theme, props, lines) {
    const { transform, field, idField, maxRadius } = await computeUnitMolecularSurface(structure, unit, theme.size, props).runInContext(ctx.runtime);
    const params = {
        isoLevel: props.probeRadius,
        scalarField: props.floodfill !== 'off' ? Tensor.createFloodfilled(field, props.probeRadius, props.floodfill) : field,
        idField
    };
    const wireframe = await computeMarchingCubesLines(params, lines).runAsChild(ctx.runtime);
    Lines.transform(wireframe, transform);
    const sphere = Sphere3D.expand(Sphere3D(), unit.boundary.sphere, maxRadius);
    wireframe.setBoundingSphere(sphere);
    return wireframe;
}
export function MolecularSurfaceWireframeVisual(materialId) {
    return UnitsLinesVisual({
        defaultProps: PD.getDefaultValues(MolecularSurfaceWireframeParams),
        createGeometry: createMolecularSurfaceWireframe,
        createLocationIterator: ElementIterator.fromGroup,
        getLoci: getElementLoci,
        eachLocation: eachElement,
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
