"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
var db_direct_1 = require("./lib/db-direct");
var promises_1 = require("fs/promises");
var path_1 = require("path");
/**
 * This script analyzes components in the database and provides detailed reports
 * of issues and patterns found in the component code.
 */
function analyzeComponents() {
    return __awaiter(this, void 0, void 0, function () {
        var sql, componentTables, customJobsExist, components, statusCounts_1, successfulComponents, analysisDir, failedComponents, errorCounts_1, errorDir, i, comp, componentsExist, schema, components, analysisDir, error_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 19, 20, 22]);
                    console.log('Connecting to Neon database...');
                    sql = "\n      SELECT * FROM information_schema.tables \n      WHERE table_schema = 'public' AND \n            table_name LIKE '%component%' OR\n            table_name LIKE '%custom%';\n    ";
                    return [4 /*yield*/, db_direct_1.dbUtils.query(sql)];
                case 1:
                    componentTables = _a.sent();
                    console.log("Found ".concat(componentTables.length, " potential component tables:"));
                    componentTables.forEach(function (table) { return console.log("- ".concat(table.table_name)); });
                    customJobsExist = componentTables.some(function (t) { return t.table_name === 'bazaar-vid_custom_component_job'; });
                    if (!customJobsExist) return [3 /*break*/, 11];
                    console.log('\nAnalyzing bazaar-vid_custom_component_job table...');
                    return [4 /*yield*/, db_direct_1.dbUtils.query("\n        SELECT id, effect, status, \"tsxCode\" as code, \"errorMessage\", \"outputUrl\"\n        FROM \"bazaar-vid_custom_component_job\"\n        ORDER BY \"createdAt\" DESC\n        LIMIT 100\n      ")];
                case 2:
                    components = _a.sent();
                    console.log("Found ".concat(components.length, " components"));
                    console.log('\nStatus breakdown:');
                    statusCounts_1 = {};
                    components.forEach(function (comp) {
                        statusCounts_1[comp.status] = (statusCounts_1[comp.status] || 0) + 1;
                    });
                    Object.entries(statusCounts_1).forEach(function (_a) {
                        var status = _a[0], count = _a[1];
                        console.log("- ".concat(status, ": ").concat(count, " components"));
                    });
                    successfulComponents = components.filter(function (c) { return c.status === 'success'; });
                    console.log("\nAnalyzing ".concat(successfulComponents.length, " successful components..."));
                    if (!(successfulComponents.length > 0)) return [3 /*break*/, 5];
                    analysisDir = path_1.default.join(process.cwd(), 'analysis');
                    return [4 /*yield*/, promises_1.default.mkdir(analysisDir, { recursive: true })];
                case 3:
                    _a.sent();
                    // Save a sample of the components for analysis
                    return [4 /*yield*/, promises_1.default.writeFile(path_1.default.join(analysisDir, 'component-sample.json'), JSON.stringify(successfulComponents.slice(0, 5), null, 2))];
                case 4:
                    // Save a sample of the components for analysis
                    _a.sent();
                    // Analyze for patterns in component code
                    analyzeComponentPatterns(successfulComponents);
                    _a.label = 5;
                case 5:
                    failedComponents = components.filter(function (c) { return c.status === 'error'; });
                    console.log("\nAnalyzing ".concat(failedComponents.length, " failed components..."));
                    if (!(failedComponents.length > 0)) return [3 /*break*/, 10];
                    errorCounts_1 = {};
                    failedComponents.forEach(function (comp) {
                        var shortError = (comp.errorMessage || '').substring(0, 50);
                        errorCounts_1[shortError] = (errorCounts_1[shortError] || 0) + 1;
                    });
                    console.log('Common error types:');
                    Object.entries(errorCounts_1)
                        .sort(function (a, b) { return b[1] - a[1]; })
                        .slice(0, 5)
                        .forEach(function (_a) {
                        var error = _a[0], count = _a[1];
                        console.log("- \"".concat(error, "...\" (").concat(count, " occurrences)"));
                    });
                    errorDir = path_1.default.join(process.cwd(), 'analysis', 'errors');
                    return [4 /*yield*/, promises_1.default.mkdir(errorDir, { recursive: true })];
                case 6:
                    _a.sent();
                    i = 0;
                    _a.label = 7;
                case 7:
                    if (!(i < Math.min(5, failedComponents.length))) return [3 /*break*/, 10];
                    comp = failedComponents[i];
                    return [4 /*yield*/, promises_1.default.writeFile(path_1.default.join(errorDir, "error-".concat(comp.id, ".txt")), "ERROR: ".concat(comp.errorMessage, "\n\nCODE:\n").concat(comp.code || 'No code'))];
                case 8:
                    _a.sent();
                    _a.label = 9;
                case 9:
                    i++;
                    return [3 /*break*/, 7];
                case 10: return [3 /*break*/, 18];
                case 11: return [4 /*yield*/, db_direct_1.dbUtils.query("\n        SELECT EXISTS (\n          SELECT FROM information_schema.tables \n          WHERE table_schema = 'public' AND table_name = 'components'\n        );\n      ")];
                case 12:
                    componentsExist = _a.sent();
                    if (!componentsExist[0].exists) return [3 /*break*/, 17];
                    console.log('\nAnalyzing components table...');
                    return [4 /*yield*/, db_direct_1.dbUtils.getTableSchema('components')];
                case 13:
                    schema = _a.sent();
                    console.log('Components table schema:');
                    schema.forEach(function (column) {
                        console.log("- ".concat(column.column_name, " (").concat(column.data_type, ")"));
                    });
                    return [4 /*yield*/, db_direct_1.dbUtils.query("\n          SELECT * FROM components\n          LIMIT 10\n        ")];
                case 14:
                    components = _a.sent();
                    console.log("\nFound ".concat(components.length, " components in sample"));
                    analysisDir = path_1.default.join(process.cwd(), 'analysis');
                    return [4 /*yield*/, promises_1.default.mkdir(analysisDir, { recursive: true })];
                case 15:
                    _a.sent();
                    // Save the sample
                    return [4 /*yield*/, promises_1.default.writeFile(path_1.default.join(analysisDir, 'components-table-sample.json'), JSON.stringify(components, null, 2))];
                case 16:
                    // Save the sample
                    _a.sent();
                    // If components have code, analyze patterns
                    if (components.length > 0 && components[0].code) {
                        analyzeComponentPatterns(components);
                    }
                    return [3 /*break*/, 18];
                case 17:
                    console.log('Could not find a standard components table.');
                    console.log('Please inspect the tables listed above and modify this script accordingly.');
                    _a.label = 18;
                case 18: return [3 /*break*/, 22];
                case 19:
                    error_1 = _a.sent();
                    console.error('Error analyzing components:', error_1);
                    return [3 /*break*/, 22];
                case 20: return [4 /*yield*/, db_direct_1.dbUtils.closeConnection()];
                case 21:
                    _a.sent();
                    return [7 /*endfinally*/];
                case 22: return [2 /*return*/];
            }
        });
    });
}
/**
 * Analyzes code patterns in a set of components and outputs findings
 */
function analyzeComponentPatterns(components) {
    console.log('\nCode Pattern Analysis:');
    // Initialize pattern counters
    var patterns = {
        useClientDirective: 0,
        destructuredImports: 0,
        singleLetterVars: 0,
        missingRemotionComponent: 0,
        totalWithCode: 0
    };
    // Analyze each component
    components.forEach(function (comp) {
        var code = comp.code || '';
        if (!code)
            return;
        patterns.totalWithCode++;
        // Check for 'use client' directive
        if (code.includes('use client')) {
            patterns.useClientDirective++;
        }
        // Check for destructured imports { x } from 'y'
        if (code.match(/import\s*{[^}]+}\s*from/)) {
            patterns.destructuredImports++;
        }
        // Check for single-letter variables using createElement
        if (code.match(/\b[a-z]\.createElement\b/)) {
            patterns.singleLetterVars++;
        }
        // Check for missing window.__REMOTION_COMPONENT
        if (!code.includes('window.__REMOTION_COMPONENT')) {
            patterns.missingRemotionComponent++;
        }
    });
    // Output findings
    console.log("Total components with code: ".concat(patterns.totalWithCode));
    console.log("- Components with 'use client' directive: ".concat(patterns.useClientDirective, " (").concat(percentage(patterns.useClientDirective, patterns.totalWithCode), "%)"));
    console.log("- Components with destructured imports: ".concat(patterns.destructuredImports, " (").concat(percentage(patterns.destructuredImports, patterns.totalWithCode), "%)"));
    console.log("- Components with single-letter variables: ".concat(patterns.singleLetterVars, " (").concat(percentage(patterns.singleLetterVars, patterns.totalWithCode), "%)"));
    console.log("- Components missing window.__REMOTION_COMPONENT: ".concat(patterns.missingRemotionComponent, " (").concat(percentage(patterns.missingRemotionComponent, patterns.totalWithCode), "%)"));
}
// Helper function to calculate percentage
function percentage(value, total) {
    if (total === 0)
        return 0;
    return Math.round((value / total) * 100);
}
analyzeComponents();
