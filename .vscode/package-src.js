const cp = require('child_process');
const fs = require('fs');
const path = require('path');

const SRC_DIRECTORY = './src';
const OUT_DIRECTORY = './out';
const ASKPASS_DIRECTORY = 'askpass';

/**
 * 递归获取目录下所有 .js 文件（含子目录）
 * tsdown bundle 后 js 文件分布在 out/ 各子目录中
 */
function getJsFilesRecursive(dir) {
	let results = [];
	for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
		const fullPath = path.join(dir, entry.name);
		if (entry.isDirectory()) {
			results = results.concat(getJsFilesRecursive(fullPath));
		} else if (entry.name.endsWith('.js')) {
			results.push(fullPath);
		}
	}
	return results;
}

// Adjust any scripts that require the Node.js File System Module to use the Node.js version (as Electron overrides the fs module with its own version of the module)
for (const scriptFilePath of getJsFilesRecursive(OUT_DIRECTORY)) {
	const mapFilePath = scriptFilePath + '.map';

	let script = fs.readFileSync(scriptFilePath).toString();
	if (script.match(/require\("fs"\)/g)) {
		// Adjust the requirement
		if (script.includes('"use strict";')) {
			script = script.replace('"use strict";', '"use strict";\r\nfunction requireWithFallback(electronModule, nodeModule) { try { return require(electronModule); } catch (err) {} return require(nodeModule); }');
		} else {
			script = 'function requireWithFallback(electronModule, nodeModule) { try { return require(electronModule); } catch (err) {} return require(nodeModule); }\n' + script;
		}
		fs.writeFileSync(scriptFilePath, script.replace(/require\("fs"\)/g, 'requireWithFallback("original-fs", "fs")'));

		// Adjust the mapping file, as we added requireWithFallback on a new line at the start of the file.
		if (fs.existsSync(mapFilePath)) {
			let data = JSON.parse(fs.readFileSync(mapFilePath).toString());
			data.mappings = ';' + data.mappings;
			fs.writeFileSync(mapFilePath, JSON.stringify(data));
		}
	}
}

// Copy the askpass shell scripts to the output directory
fs.readdirSync(path.join(SRC_DIRECTORY, ASKPASS_DIRECTORY)).forEach((fileName) => {
	if (fileName.endsWith('.sh')) {
		// If the file is a shell script, read its contents and write it to the output directory
		const scriptContents = fs.readFileSync(path.join(SRC_DIRECTORY, ASKPASS_DIRECTORY, fileName)).toString();
		fs.writeFileSync(path.join(OUT_DIRECTORY, ASKPASS_DIRECTORY, fileName), scriptContents);
	}
});
