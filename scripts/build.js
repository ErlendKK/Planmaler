import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

// Get the directory name of the current module
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Navigate to the root directory
const ROOT_DIR = path.resolve(__dirname, "..");
const DOCS_DIR = path.join(ROOT_DIR, "docs");
const LAGER_DIR = path.join(ROOT_DIR, "lager");

async function copyFile(src, dest) {
  try {
    await fs.copyFile(src, dest);
    console.log(`Copied ${src} to ${dest}`);
  } catch (error) {
    console.error(`Error copying ${src} to ${dest}:`, error);
  }
}

async function modifyIndexHtml() {
  const indexPath = path.join(DOCS_DIR, "index.html");
  try {
    let content = await fs.readFile(indexPath, "utf-8");
    const scriptToInsert = `
    <script type="text/javascript">
      // Single Page Apps for GitHub Pages
      // MIT License
      // https://github.com/rafgraph/spa-github-pages
      // This script checks to see if a redirect is present in the query string,
      // converts it back into the correct url and adds it to the
      // browser's history using window.history.replaceState(...),
      // which won't cause the browser to attempt to load the new url.
      // When the single page app is loaded further down in this file,
      // the correct url will be waiting in the browser's history for
      // the single page app to route accordingly.
      (function (l) {
        if (l.search[1] === "/") {
          var decoded = l.search
            .slice(1)
            .split("&")
            .map(function (s) {
              return s.replace(/~and~/g, "&");
            })
            .join("?");
          window.history.replaceState(null, null, l.pathname.slice(0, -1) + decoded + l.hash);
        }
      })(window.location);
    </script>
    `;

    // Insert the script just after the <body> tag
    content = content.replace("<body>", `<body>\n    ${scriptToInsert}`);

    await fs.writeFile(indexPath, content, "utf-8");
    console.log("Modified index.html successfully");
  } catch (error) {
    console.error("Error modifying index.html:", error);
  }
}

async function main() {
  // Step 1: Copy 404.html from /lager to /docs
  await copyFile(path.join(LAGER_DIR, "404.html"), path.join(DOCS_DIR, "404.html"));

  // Step 2: Modify index.html to include the SPA script
  await modifyIndexHtml();

  console.log("Post-build process completed successfully");
}

main().catch(console.error);
