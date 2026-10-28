// License deeds (plan F5): import-free, so the build (sources.ts re-exports them) and the Learn bundle's cards share
// one copy.

// Deed URL per license string in the data (sources and photos); null where there is no license (public domain).
export const LICENSE_URLS: Record<string, string | null> = {
  "Public domain": null,
  "CC0": "https://creativecommons.org/publicdomain/zero/1.0/",
  "CC0 1.0": "https://creativecommons.org/publicdomain/zero/1.0/",
  "CC BY 2.0": "https://creativecommons.org/licenses/by/2.0/",
  "CC BY 2.5": "https://creativecommons.org/licenses/by/2.5/",
  "CC BY 4.0": "https://creativecommons.org/licenses/by/4.0/",
  "CC BY-SA 2.0": "https://creativecommons.org/licenses/by-sa/2.0/",
  "CC BY-SA 2.0 de": "https://creativecommons.org/licenses/by-sa/2.0/de/",
  "CC BY-SA 2.5": "https://creativecommons.org/licenses/by-sa/2.5/",
  "CC BY-SA 3.0": "https://creativecommons.org/licenses/by-sa/3.0/",
  "CC BY-SA 4.0": "https://creativecommons.org/licenses/by-sa/4.0/",
};

export function licenseUrl(license: string): string | null {
  if (!Object.hasOwn(LICENSE_URLS, license)) throw new Error(`unknown license "${license}": add it to LICENSE_URLS in scripts/build/licenses.ts`);
  return LICENSE_URLS[license];
}
