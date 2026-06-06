// Smoke #5 — drive all 10 tools over real stdio transport.
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, "..", "..");
const serverEntry = resolve(repoRoot, "dist", "index.js");
const fixtureDir = resolve(repoRoot, "test", "fixtures", "nest-app");

const transport = new StdioClientTransport({
  command: process.execPath,
  args: [serverEntry, "--project", fixtureDir],
  cwd: repoRoot,
});

const client = new Client({ name: "smoke", version: "0.0.0" });
await client.connect(transport);

const tools = await client.listTools();
console.log("TOOLS:", tools.tools.map((t) => t.name).join(", "));

// 1. find_symbol
const r1 = await client.callTool({ name: "find_symbol", arguments: { name: "UserService" } });
const p1 = JSON.parse(r1.content[0].text);
console.log(`\n✅ find_symbol: found ${p1.total} match(es), name=${p1.items[0].name}`);

// 2. get_symbol_info
const r2 = await client.callTool({ name: "get_symbol_info", arguments: { name: "UserService#findOne" } });
const p2 = JSON.parse(r2.content[0].text);
console.log(`✅ get_symbol_info: ${p2.items[0].name} (${p2.items[0].kind})`);

// 3. find_references
const r3 = await client.callTool({ name: "find_references", arguments: { name: "UserService" } });
const p3 = JSON.parse(r3.content[0].text);
const refKinds = [...new Set(p3.items.map((i) => i.refKind))].sort();
console.log(`✅ find_references: ${p3.total} refs, kinds: ${refKinds.join(", ")}`);

// 4. find_by_decorator
const r4 = await client.callTool({ name: "find_by_decorator", arguments: { decorator: "Controller" } });
const p4 = JSON.parse(r4.content[0].text);
console.log(`✅ find_by_decorator: found ${p4.total} @Controller, name=${p4.items[0].symbol.name}, args=${p4.items[0].argsText}`);

// 5. get_diagnostics
const r5 = await client.callTool({ name: "get_diagnostics", arguments: {} });
const p5 = JSON.parse(r5.content[0].text);
console.log(`✅ get_diagnostics: ${p5.total} diagnostic(s)`);

// 6. reload_project
const r6 = await client.callTool({ name: "reload_project", arguments: {} });
const p6 = JSON.parse(r6.content[0].text);
console.log(`✅ reload_project: reloaded=${p6.reloaded}`);

// --- Switch to react-app fixture for JSX/export tools ---
// Reconnect with react-app fixture
await client.close();

const reactFixtureDir = resolve(repoRoot, "test", "fixtures", "react-app");
const transport2 = new StdioClientTransport({
  command: process.execPath,
  args: [serverEntry, "--project", reactFixtureDir],
  cwd: repoRoot,
});
const client2 = new Client({ name: "smoke", version: "0.0.0" });
await client2.connect(transport2);

// 7. find_jsx_usage
const r7 = await client2.callTool({ name: "find_jsx_usage", arguments: { component: "Button" } });
const p7 = JSON.parse(r7.content[0].text);
console.log(`✅ find_jsx_usage: ${p7.total} JSX usage(s) of Button, parent=${p7.items[0].parentComponent}`);

// 8. get_exports
const r8 = await client2.callTool({ name: "get_exports", arguments: { file: "components/index.ts" } });
const p8 = JSON.parse(r8.content[0].text);
const exportNames = p8.exports.map((e) => e.name).join(", ");
console.log(`✅ get_exports: ${p8.exports.length} exports from barrel: ${exportNames}`);

// 9. get_component_tree
const r9 = await client2.callTool({ name: "get_component_tree", arguments: { component: "App" } });
const p9 = JSON.parse(r9.content[0].text);
const childNames = p9.tree.children.map((c) => c.name).join(", ");
console.log(`✅ get_component_tree: root=${p9.tree.name}, children=[${childNames}]`);

// 10. find_hooks
const r10 = await client2.callTool({ name: "find_hooks", arguments: { component: "ConnectedUserList" } });
const p10 = JSON.parse(r10.content[0].text);
const hookNames = p10.hooks.map((h) => h.hook).join(", ");
console.log(`✅ find_hooks: ${p10.hooks.length} hooks in ${p10.component}: ${hookNames}`);

await client2.close();
console.log("\n🎉 ALL 10 TOOLS SMOKE OK");
