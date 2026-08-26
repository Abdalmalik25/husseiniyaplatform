// Extracts the tRPC procedure usage (trpc.<router>.<proc>.useQuery|useMutation)
// from every page/component so the operational test knows exactly which
// DB-backed procedures each screen calls.
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const dir = join(root, "client", "src");
const re =
  /trpc\.(\w+)\.(\w+)\.(useQuery|useMutation|useInfiniteQuery|useSuspenseQuery|useSuspenseInfiniteQuery)\b/g;

const pages = readdirSync(join(dir, "pages"));
const components = readdirSync(join(dir, "components"));

function scan(list, sub) {
  for (const f of list) {
    if (!f.endsWith(".tsx") && !f.endsWith(".ts")) continue;
    const text = readFileSync(join(dir, sub, f), "utf8");
    const seen = new Map();
    let m;
    while ((m = re.exec(text)) !== null) {
      const key = `${m[1]}.${m[2]}`;
      seen.set(key, (seen.get(key) || 0) + 1);
    }
    if (seen.size > 0) {
      console.log(`=== ${sub}/${f} ===`);
      for (const k of [...seen.keys()].sort((a, b) => a.localeCompare(b))) {
        console.log(`   trpc.${k}  x${seen.get(k)}`);
      }
    }
  }
}

console.log("########## PAGES ##########");
scan(pages, "pages");
console.log("\n########## COMPONENTS ##########");
scan(components, "components");
