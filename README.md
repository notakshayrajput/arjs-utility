# ar-mpatch utility

Small Node.js utility to fetch ActiveReports JS artifacts into a local `./cdn` folder, scan and modify those files, and save modified outputs to `./dist`.

## Prerequisites
- Node.js (recommended LTS: v16+)
- No external npm packages required (uses built-in modules)

## Files and folders
- `./cdn` — input folder where downloaded/original .js files are stored
- `./dist` — output folder where modified files are saved (suffix `.mod.js`)
- `ar-mpatch.js` — CLI script implementing the commands

## What the script does
- `-download` — downloads a fixed list of ActiveReports JS files into `./cdn`.
- `-mod` — scans every `.js` file in `./cdn`, logs occurrences of the token `gc` with surrounding context and position, replaces occurrences of `gc` with `gc1` (excludes CSS-like `gc-` and quoted occurrences per the script's regex), and (after a single confirmation prompt) writes modified files to `./dist` as `<original>.mod.js`.
- `-clean` — deletes the entire `./cdn` directory recursively.

The script logs progress and errors to the console.

## Usage examples
Open a terminal in this folder (`ActiveReportsViewer\arjs-utility`) and run:

- Download files to `./cdn`:
  node ar-mpatch.js -download

- Prepare and write modified files (prompts before writing):
  node ar-mpatch.js -mod

- Delete the `./cdn` folder:
  node ar-mpatch.js -clean

- Run multiple commands in sequence:
  node ar-mpatch.js -download -mod

- Show help:
  node ar-mpatch.js -h
  node ar-mpatch.js --help

## Behavior notes
- If `./cdn` does not exist, `-download` will create it.
- `-mod` requires `./cdn` to exist and contain `.js` files; otherwise it exits.
- Modified files are written to `./dist` with the `.mod.js` suffix. The script creates `./dist` if needed.
- The replacement uses the following rules implemented in the script:
  - Matches the token `gc` as a whole word.
  - Excludes `gc` followed by `-` (common in CSS classes).
  - Excludes `gc` followed by immediate quotes (to avoid replacing string literals).
- The script uses `fs.rmSync` to remove `./cdn`; ensure your Node version supports it (Node v14.14+ recommended).

## Customization
- To change which files are downloaded, edit the `filesToDownload` array in `ar-mpatch.js`.
- To change the replacement or matching rules, edit `contextRegex` / `replaceRegex` at the top of `ar-mpatch.js`.
- To change output file suffix, modify the `writeModifiedFiles` function.

## Troubleshooting
- Permission errors writing files: run your terminal with sufficient permissions or change folder permissions.
- Network/download failures: ensure you have internet access and the URLs in `filesToDownload` are reachable.

If you want, I can:
- Add retry logic to downloads,
- Make downloads parallel with concurrency control,
- Or change the replacement to produce an in-place backup + in-place update instead of writing to `./dist`.