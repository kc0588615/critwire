// childFile (plan D9.2): the one guard on every computed output path.

// One path segment: letters, digits, ".", "_" and "-", and not "." or "..", so URL parsing can't read it as anything else.
const SEGMENT = /^(?!\.\.?$)[A-Za-z0-9._-]+$/;

// dir/name, for a relative name of plain segments ("species/12.json"). Throws for a name that would leave dir, name dir
// itself, or change under URL parsing (?, #, %, a backslash, an empty segment), and for a dir without its trailing slash.
export function childFile(dir: URL, name: string): URL {
  if (!dir.href.endsWith("/")) throw new Error(`childFile: folder ${dir.href} must end with /`);
  if (!name.split("/").every((s) => SEGMENT.test(s))) throw new Error(`childFile: ${JSON.stringify(name)} isn't a plain relative path inside ${dir.href}`);
  const url = new URL(name, dir);
  if (!url.href.startsWith(dir.href)) throw new Error(`childFile: ${JSON.stringify(name)} leaves ${dir.href}`);
  return url;
}
