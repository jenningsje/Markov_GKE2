"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.testQ = testQ;
const tslib_1 = require("tslib");
const builder_1 = require("../mol-script/language/builder.js");
const compiler_1 = require("../mol-script/runtime/query/compiler.js");
const structure_1 = require("../mol-model/structure.js");
const model_1 = require("../cli/structure-info/model.js");
const symbol_1 = require("../mol-script/language/symbol.js");
const type_1 = require("../mol-script/language/type.js");
const parser_1 = require("../mol-script/language/parser.js");
const util = tslib_1.__importStar(require("util"));
const symbols_1 = require("../mol-script/script/mol-script/symbols.js");
const expression_formatter_1 = require("../mol-script/language/expression-formatter.js");
const prop_1 = require("../extensions/pdbe/structure-quality-report/prop.js");
const node_fetch_1 = tslib_1.__importDefault(require("node-fetch"));
const custom_property_1 = require("../mol-model/custom-property.js");
// import Examples from 'mol-script/script/mol-script/examples'
// import { parseMolScript } from 'mol-script/script/mol-script/parser'
// //import { compileAST } from 'mol-script/script/mol-script/compile';
// for (const e of Examples) {
//     const expr = parseMolScript(e.value)[0];
//     console.log(e.name, util.inspect(expr, true, 10, true));
// }
// const exprs = parseMolScript(`(sel.atom.atom-groups
//     :residue-test (= atom.auth_comp_id ALA)
//     ;; ho ho ho
//     :atom-test (set.has { _C _N } atom.el)) ; comm
//     ;; this is a comment
//     ((hi) (ho))`);
// ;; :residue-test (= atom.label_comp_id REA)
const exprs = (0, parser_1.parseMolScript)(`(sel.atom.atom-groups
    :residue-test (> pdbe.structure-quality.issue-count 0)
    :atom-test (= atom.el _C))`);
const tsp = (0, symbols_1.transpileMolScript)(exprs[0]);
// console.log(util.inspect(exprs, true, 10, true));
console.log(util.inspect(tsp, true, 10, true));
console.log(expression_formatter_1.formatMolScript);
console.log((0, expression_formatter_1.formatMolScript)(tsp));
// //console.log(expr);
const expr = builder_1.MolScriptBuilder.core.math.add([1, 2, 3]);
const compiled = (0, compiler_1.compile)(expr);
const result = compiled(new structure_1.QueryContext(structure_1.Structure.Empty));
console.log(result);
const CustomProp = (0, custom_property_1.CustomPropertyDescriptor)({
    name: 'test_prop',
    cifExport: { prefix: '', categories: [] },
    symbols: {
        residueIndex: compiler_1.QuerySymbolRuntime.Dynamic((0, symbol_1.CustomPropSymbol)('custom.test-prop', 'residue-index', type_1.Type.Num), ctx => {
            const e = ctx.element;
            // console.log(e.element, e.unit.model.atomicHierarchy.residueAtomSegments.index[e.element])
            return e.unit.model.atomicHierarchy.residueAtomSegments.index[e.element];
        })
    }
});
compiler_1.DefaultQueryRuntimeTable.addCustomProp(CustomProp);
compiler_1.DefaultQueryRuntimeTable.addCustomProp(prop_1.StructureQualityReportProvider.descriptor);
async function testQ() {
    const frame = await (0, model_1.readCifFile)('e:/test/quick/1cbs_updated.cif');
    const { structure } = await (0, model_1.getModelsAndStructure)(frame);
    const model = structure.models[0];
    const rawData = await (0, node_fetch_1.default)(`https://www.ebi.ac.uk/pdbe/api/validation/residuewise_outlier_summary/entry/${model.entryId.toLowerCase()}`);
    const data = prop_1.StructureQualityReport.fromJson(model, await rawData.json());
    prop_1.StructureQualityReportProvider.set(model, { serverUrl: '' }, data);
    let expr = builder_1.MolScriptBuilder.struct.generator.atomGroups({
        'atom-test': builder_1.MolScriptBuilder.core.rel.eq([
            builder_1.MolScriptBuilder.struct.atomProperty.core.elementSymbol(),
            builder_1.MolScriptBuilder.es('C')
        ]),
        // 'residue-test': MolScriptBuilder.core.rel.eq([
        //     MolScriptBuilder.struct.atomProperty.macromolecular.label_comp_id(),
        //     'REA'
        // ])
        'residue-test': builder_1.MolScriptBuilder.core.rel.inRange([CustomProp.symbols.residueIndex.symbol(), 1, 5])
    });
    expr = tsp;
    const compiled = (0, compiler_1.compile)(expr);
    const result = compiled(new structure_1.QueryContext(structure));
    console.log(result);
}
testQ();
