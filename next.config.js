/** @type {import('next').NextConfig} */
const path = require("path");

// Force webpack to use a single copy of each ProseMirror package.
// Without this, @tiptap/pm re-exports and direct imports can create
// duplicate module instances, causing DOMSerializer schema mismatches
// that crash renderSpec ("Invalid array passed to renderSpec").
const prosemirrorPackages = [
  "prosemirror-model",
  "prosemirror-view",
  "prosemirror-state",
  "prosemirror-transform",
  "prosemirror-tables",
  "prosemirror-keymap",
  "prosemirror-commands",
  "prosemirror-inputrules",
  "prosemirror-gapcursor",
  "prosemirror-dropcursor",
  "prosemirror-history",
  "prosemirror-schema-list",
  "prosemirror-schema-basic",
  "prosemirror-collab",
  "prosemirror-markdown",
];

function buildProsemirrorAliases() {
  const aliases = {};
  for (const pkg of prosemirrorPackages) {
    try {
      // resolve the main entry, then walk up to the package root
      const entry = require.resolve(pkg);
      // entry is like .../node_modules/prosemirror-model/dist/index.cjs
      // package root is .../node_modules/prosemirror-model
      let dir = path.dirname(entry);
      while (dir !== path.dirname(dir)) {
        if (path.basename(dir) === pkg || path.basename(path.dirname(dir)) === "@tiptap") break;
        dir = path.dirname(dir);
      }
      // Verify we got the right directory
      if (path.basename(dir) === pkg) {
        aliases[pkg] = dir;
      }
    } catch {
      // Package not installed — skip
    }
  }
  return aliases;
}

// Compute the ProseMirror alias map ONCE at module load. webpack(config) is
// invoked multiple times (client, server, edge), so building it inside the
// hook re-ran 14 require.resolve() calls each time for no benefit.
const prosemirrorAliases = buildProsemirrorAliases();

const nextConfig = {
  serverExternalPackages: [
    "@blocknote/core",
    "@blocknote/react",
    "@blocknote/mantine",
  ],
  webpack: (config) => {
    config.resolve.fallback = { ...config.resolve.fallback, fs: false };

    // Deduplicate ProseMirror packages across @tiptap/pm, @blocknote/*, etc.
    config.resolve.alias = {
      ...config.resolve.alias,
      ...prosemirrorAliases,
    };

    return config;
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**" },
    ],
  },
  // Performance: tree-shake big barrel packages so dev/prod only compile the
  // icons/components actually imported instead of the whole package surface.
  experimental: {
    optimizePackageImports: [
      "lucide-react",
      "recharts",
      "date-fns",
      "framer-motion",
      "cmdk",
      "@radix-ui/react-dialog",
      "@radix-ui/react-dropdown-menu",
      "@radix-ui/react-select",
      "@radix-ui/react-popover",
      "@radix-ui/react-tabs",
      "@radix-ui/react-tooltip",
      "@radix-ui/react-context-menu",
      "@radix-ui/react-scroll-area",
      "@radix-ui/react-avatar",
    ],
  },
  // Compress responses
  compress: true,
  // Reduce powered-by header
  poweredByHeader: false,
};

module.exports = nextConfig;
