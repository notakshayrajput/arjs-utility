const https = require('https');
const fs = require('fs');
const path = require('path');

const inputDir = path.join(__dirname, 'cdn');
const outputDir = path.join(__dirname, 'dist');

// Regular expressions (keeps your original intent)
const contextRegex = /(?:.{0,10})(?:\b)(gc)(?!-)(?!\s*['\"])(?:\b)(?:.{0,10})/g;
const replaceRegex = /\b(gc)(?!-)(?!\s*['"])\b/g;

// Files used by download command (copied from download.js)
const filesToDownload = [
    { url: "https://cdn.mescius.com/activereportsjs/5.latest/dist/ar-js-core.js", filename: "ar-js-core.js" },
    { url: "https://cdn.mescius.com/activereportsjs/5.latest/dist/ar-js-viewer.js", filename: "ar-js-viewer.js" },
    { url: "https://cdn.mescius.com/activereportsjs/5.latest/dist/ar-js-designer.js", filename: "ar-js-designer.js" },
    { url: "https://cdn.mescius.com/activereportsjs/5.latest/dist/ar-js-pdf.js", filename: "ar-js-pdf.js" },
    { url: "https://cdn.mescius.com/activereportsjs/5.latest/dist/ar-js-tabular-data.js", filename: "ar-js-tabular-data.js" },
    { url: "https://cdn.mescius.com/activereportsjs/5.latest/dist/ar-js-html.js", filename: "ar-js-html.js" }
];

function downloadFile(url, outputPath) {
    return new Promise((resolve, reject) => {
        const file = fs.createWriteStream(outputPath);
        https
            .get(url, (response) => {
                if (response.statusCode !== 200) {
                    reject(new Error(`Failed to get '${url}' (${response.statusCode})`));
                    return;
                }
                response.pipe(file);
                file.on("finish", () => {
                    file.close(() => resolve(outputPath));
                });
            })
            .on("error", (err) => {
                fs.unlink(outputPath, () => reject(err));
            });
    });
}

async function downloadFiles() {
    // Ensure cdn directory exists
    if (!fs.existsSync(inputDir)) {
        fs.mkdirSync(inputDir, { recursive: true });
        console.log('Created cdn directory:', inputDir);
    }

    for (const file of filesToDownload) {
        const outputPath = path.join(inputDir, file.filename);
        try {
            console.log("Downloading file:", file.url);
            await downloadFile(file.url, outputPath);
            console.log("File downloaded successfully:", outputPath);
        } catch (err) {
            console.error(`Download failed for ${file.filename}:`, err);
        }
    }
    console.log("All downloads completed!");
}

function collectAndPrepareUpdates() {
    if (!fs.existsSync(inputDir)) {
        console.error(`Input directory not found: ${inputDir}`);
        process.exit(1);
    }
    fs.mkdirSync(outputDir, { recursive: true });

    const jsFiles = fs.readdirSync(inputDir).filter(f => f.toLowerCase().endsWith('.js'));
    if (jsFiles.length === 0) {
        console.log('No .js files found in:', inputDir);
        process.exit(0);
    }

    const processed = [];

    for (const filename of jsFiles) {
        const inputFilePath = path.join(inputDir, filename);
        console.log(`\nProcessing: ${inputFilePath}`);
        try {
            const content = fs.readFileSync(inputFilePath, 'utf8');

            // Log matches with context
            let match;
            let matchCount = 0;
            contextRegex.lastIndex = 0;
            console.log('Found matches of "gc" with surrounding context:');
            console.log('----------------------------------------');

            while ((match = contextRegex.exec(content)) !== null) {
                matchCount++;
                console.log(`Match ${matchCount}: "${match[0].trim()}"`);
                console.log(`Position: ${match.index}`);
                console.log('----------------------------------------');
            }
            console.log(`Total matches in ${filename}: ${matchCount}`);

            // Prepare modified content (perform replacement)
            const modifiedContent = content.replace(replaceRegex, 'gc1');

            processed.push({
                filename,
                inputFilePath,
                modifiedContent,
                matches: matchCount
            });
        } catch (fileErr) {
            console.error(`Error reading/processing ${inputFilePath}:`, fileErr);
        }
    }

    return processed;
}

function writeModifiedFiles(processed) {
    for (const item of processed) {
        const base = path.basename(item.filename, '.js');
        const outName = `${base}.mod.js`;
        const outputFilePath = path.join(outputDir, outName);
        try {
            fs.writeFileSync(outputFilePath, item.modifiedContent, 'utf8');
            console.log(`Saved: ${outputFilePath} (matches: ${item.matches})`);
        } catch (writeErr) {
            console.error(`Failed to write ${outputFilePath}:`, writeErr);
        }
    }
    console.log('\nAll selected files written to:', outputDir);
}

function cleanCdn() {
    if (!fs.existsSync(inputDir)) {
        console.log('cdn directory does not exist, nothing to clean:', inputDir);
        return;
    }
    try {
        // Node 12+: fs.rmSync with recursive; fallback to rmdirSync for older Node not required here
        fs.rmSync(inputDir, { recursive: true, force: true });
        console.log('Deleted cdn directory:', inputDir);
    } catch (err) {
        console.error('Failed to delete cdn directory:', err);
        process.exit(1);
    }
}

function printUsage() {
    console.log('Usage: node mpatch <command>');
    console.log('Commands:');
    console.log('  -download   Download files into ./cdn');
    console.log('  -mod     Scan ./cdn .js files, replace gc -> gc1 and save to ./dist (prompts before writing)');
    console.log('  -clean      Delete the ./cdn directory');
}

// Main CLI dispatch
(async function main() {
    const args = process.argv.slice(2);
    if (args.length === 0) {
        printUsage();
        process.exit(0);
    }

    // Allow multiple commands; process in given order
    for (const arg of args) {
        switch (arg) {
            case '-download':
                await downloadFiles();
                break;

            case '-mod': {
                const processed = collectAndPrepareUpdates();
                const totalFiles = processed.length;

                const readline = require('readline').createInterface({
                    input: process.stdin,
                    output: process.stdout
                });

                // Ask once whether to write all modified files
                await new Promise((resolve) => {
                    readline.question(`\nCreate modified files for ${totalFiles} file(s) in "${outputDir}"? (y/n): `, (answer) => {
                        if (answer.toLowerCase() === 'y') {
                            writeModifiedFiles(processed);
                        } else {
                            console.log('\nOperation cancelled. No files were written.');
                        }
                        readline.close();
                        resolve();
                    });
                });
                break;
            }

            case '-clean':
                cleanCdn();
                break;

            case '-h':
            case '--help':
                printUsage();
                break;

            default:
                console.warn('Unknown command:', arg);
                printUsage();
                process.exit(1);
        }
    }
})();