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
/**
 * This script explores the database structure and outputs details
 * about available tables and their schema
 */
function exploreDatabase() {
    return __awaiter(this, void 0, void 0, function () {
        var tables, _i, tables_1, table, count, componentsTable, schema, sampleData, potentialComponentTables, firstTable, schema, sampleData, error_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 13, 14, 16]);
                    console.log('Connecting to Neon database...');
                    // List all tables
                    console.log('\n=== Database Tables ===');
                    return [4 /*yield*/, db_direct_1.dbUtils.listTables()];
                case 1:
                    tables = _a.sent();
                    tables.forEach(function (table, index) {
                        console.log("".concat(index + 1, ". ").concat(table.table_name));
                    });
                    // Output row counts for all tables
                    console.log('\n=== Table Row Counts ===');
                    _i = 0, tables_1 = tables;
                    _a.label = 2;
                case 2:
                    if (!(_i < tables_1.length)) return [3 /*break*/, 5];
                    table = tables_1[_i];
                    return [4 /*yield*/, db_direct_1.dbUtils.getTableCount(table.table_name)];
                case 3:
                    count = _a.sent();
                    console.log("".concat(table.table_name, ": ").concat(count, " rows"));
                    _a.label = 4;
                case 4:
                    _i++;
                    return [3 /*break*/, 2];
                case 5:
                    componentsTable = tables.find(function (t) { return t.table_name === 'components'; });
                    if (!componentsTable) return [3 /*break*/, 8];
                    console.log('\n=== Components Table Schema ===');
                    return [4 /*yield*/, db_direct_1.dbUtils.getTableSchema('components')];
                case 6:
                    schema = _a.sent();
                    schema.forEach(function (column) {
                        console.log("".concat(column.column_name, " (").concat(column.data_type, ")").concat(column.is_nullable === 'YES' ? ', nullable' : '').concat(column.column_default ? ", default: ".concat(column.column_default) : ''));
                    });
                    // Sample data from components
                    console.log('\n=== Components Sample Data ===');
                    return [4 /*yield*/, db_direct_1.dbUtils.query('SELECT id, status FROM components LIMIT 3')];
                case 7:
                    sampleData = _a.sent();
                    console.log(sampleData);
                    return [3 /*break*/, 12];
                case 8:
                    // If no "components" table exists, look for tables that might contain component data
                    console.log('\n=== Looking for component-related tables ===');
                    potentialComponentTables = tables.filter(function (t) {
                        return t.table_name.includes('component') ||
                            t.table_name.includes('custom');
                    });
                    if (!(potentialComponentTables.length > 0)) return [3 /*break*/, 11];
                    console.log('Found potential component tables:');
                    potentialComponentTables.forEach(function (t) { return console.log("- ".concat(t.table_name)); });
                    firstTable = potentialComponentTables[0].table_name;
                    console.log("\n=== ".concat(firstTable, " Schema ==="));
                    return [4 /*yield*/, db_direct_1.dbUtils.getTableSchema(firstTable)];
                case 9:
                    schema = _a.sent();
                    schema.forEach(function (column) {
                        console.log("".concat(column.column_name, " (").concat(column.data_type, ")").concat(column.is_nullable === 'YES' ? ', nullable' : '').concat(column.column_default ? ", default: ".concat(column.column_default) : ''));
                    });
                    // Sample data from first potential component table
                    console.log("\n=== ".concat(firstTable, " Sample Data ==="));
                    return [4 /*yield*/, db_direct_1.dbUtils.query("SELECT * FROM ".concat(firstTable, " LIMIT 3"))];
                case 10:
                    sampleData = _a.sent();
                    console.log(JSON.stringify(sampleData, null, 2));
                    return [3 /*break*/, 12];
                case 11:
                    console.log('No component-related tables found.');
                    _a.label = 12;
                case 12: return [3 /*break*/, 16];
                case 13:
                    error_1 = _a.sent();
                    console.error('Error exploring database:', error_1);
                    return [3 /*break*/, 16];
                case 14: return [4 /*yield*/, db_direct_1.dbUtils.closeConnection()];
                case 15:
                    _a.sent();
                    return [7 /*endfinally*/];
                case 16: return [2 /*return*/];
            }
        });
    });
}
exploreDatabase();
