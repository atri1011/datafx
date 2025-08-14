const fs = require('fs');
const path = require('path');

const DIST_DIR = 'dist';
const SRC_DIR = 'src';
const ENTRY_FILE = path.join(SRC_DIR, 'main.js');
const OUTPUT_FILE = path.join(DIST_DIR, 'bilibili-popular-analyzer.user.js');

/**
 * A simple bundler to resolve dependencies and inline them.
 * @param {string} entryFilePath - The path to the entry file.
 * @returns {string} - The bundled code.
 */
function bundle(entryFilePath) {
    const entryDir = path.dirname(entryFilePath);
    let bundledCode = fs.readFileSync(entryFilePath, 'utf-8');
    const importedModules = new Set([path.resolve(entryFilePath)]);

    const importRegex = /import\s+.*?from\s+['"](\.\/.*?)['"]/g;

    let match;
    while ((match = importRegex.exec(bundledCode)) !== null) {
        const relativePath = match[1];
        const absolutePath = path.resolve(entryDir, relativePath);

        if (importedModules.has(absolutePath)) {
            // Replace with empty string if already imported to avoid duplication
            bundledCode = bundledCode.replace(match[0], '');
            continue;
        }

        importedModules.add(absolutePath);
        let moduleContent = fs.readFileSync(absolutePath, 'utf-8');

        // Remove export keywords from the module content
        moduleContent = moduleContent.replace(/^export /gm, '');

        // Recursively bundle dependencies of the current module
        const nestedImportRegex = /import\s+(?:\{[^}]+\}|.*?)\s+from\s+['"](\.\/.*?)['"]/g;
        let nestedMatch;
        while ((nestedMatch = nestedImportRegex.exec(moduleContent)) !== null) {
            const nestedRelativePath = nestedMatch[1];
            const nestedAbsolutePath = path.resolve(path.dirname(absolutePath), nestedRelativePath);
            if (!importedModules.has(nestedAbsolutePath)) {
                const nestedContent = bundle(nestedAbsolutePath); // Recursive call
                moduleContent = moduleContent.replace(nestedMatch, `\n// --- Inlined: ${nestedRelativePath} ---\n${nestedContent}\n// --- End Inlined: ${nestedRelativePath} ---\n`);
                importedModules.add(nestedAbsolutePath);
            } else {
                 moduleContent = moduleContent.replace(nestedMatch[0], '');
            }
        }
        
        // Wrap module in a closure to avoid scope conflicts.
        // We are replacing `require` with the actual code, so we need to handle `module.exports`.
        // A simple approach is to wrap the content and expose exports.
        const wrappedContent = `(() => {\nconst module = { exports: {} };\n${moduleContent}\nreturn module.exports;\n})()`;
        bundledCode = bundledCode.replace(match[0], wrappedContent);
    }
    return bundledCode;
}


/**
 * Inlines CSS files into a JS string.
 * @param {string} code - The JavaScript code containing the placeholder.
 * @returns {string} The code with CSS inlined.
 */
function inlineStyles(code) {
    const styleDir = path.join(SRC_DIR, 'styles');
    const cssFiles = fs.readdirSync(styleDir).filter(file => file.endsWith('.css'));
    let allCss = '';
    for (const file of cssFiles) {
        allCss += fs.readFileSync(path.join(styleDir, file), 'utf-8') + '\n';
    }
    // Using a placeholder `__INLINE_STYLES__` which should be present in the source, e.g., in ui.js
    return code.replace('__INLINE_STYLES__', JSON.stringify(allCss));
}

/**
 * Generates the UserScript header.
 * @returns {string} The GM_header string.
 */
function generateHeader() {
    const pkg = JSON.parse(fs.readFileSync('package.json', 'utf-8'));
    return `// ==UserScript==
// @name         ${pkg.name}
// @namespace    http://tampermonkey.net/
// @version      ${pkg.version}
// @description  ${pkg.description}
// @author       ${pkg.author}
// @match        https://www.bilibili.com/v/popular/all
// @match        https://www.bilibili.com/video/*
// @grant        GM_addStyle
// @grant        GM_xmlhttpRequest
// @require      https://cdn.jsdelivr.net/npm/papaparse@5.3.0/papaparse.min.js
// @require      https://cdn.jsdelivr.net/npm/echarts@5.3.2/dist/echarts.min.js
// ==/UserScript==
`;
}

/**
 * Main build process.
 */
function main() {
    if (!fs.existsSync(DIST_DIR)) {
        fs.mkdirSync(DIST_DIR);
    }

    console.log('Starting bundle process...');
    let finalCode = bundle(ENTRY_FILE);

    console.log('Inlining styles...');
    finalCode = inlineStyles(finalCode);

    console.log('Generating UserScript header...');
    const header = generateHeader();

    const finalScript = header + '\n' + `(function() {\n'use strict';\n\n${finalCode}\n})();`;

    fs.writeFileSync(OUTPUT_FILE, finalScript);
    console.log(`✅ Success! Script built at ${OUTPUT_FILE}`);
}

main();