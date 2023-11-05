/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as path from 'path';
import { Uri, workspace } from 'vscode';
import { parseTree, findNodeAtLocation } from 'jsonc-parser';


async function pathExists(filePath: string) {
	try {
		await workspace.fs.stat(Uri.file(filePath));
	} catch {
		return false;
	}
	return true;
}

export async function findPreferredPM(pkgPath: string): Promise<{ name: string; multipleLockFilesDetected: boolean }> {
	const detectedPackageManagerNames: string[] = [];
	let has_npm_lock = false;
	let has_pnpm_lock = false;
	let has_yarn_lock = false;
	let name;
	for (let p = pkgPath; p !== path.dirname(p); p = path.dirname(p)) {
		const f = path.join(p, 'package.json');
		const t = await workspace.openTextDocument(f);
		const text = t.getText();
		const parseResult = parseTree(text);
		if (parseResult) {
			const node = findNodeAtLocation(parseResult, ['packageManager']);
			const val = node?.value;
			if (val) {
				name = val.split('@')[0];
			}
		}
		has_npm_lock ||= await pathExists(path.join(p, 'package-lock.json')) || await pathExists(path.join(p, 'npm-shrinkwrap.json'));
		if (has_npm_lock) { name ||= 'npm'; }
		has_pnpm_lock ||= await pathExists(path.join(p, 'pnpm-lock.yaml')) || await pathExists(path.join(p, 'shrinkwrap.yaml'));
		if (has_pnpm_lock) { name ||= 'pnpm'; }
		has_yarn_lock ||= await pathExists(path.join(p, 'yarn.lock'));
		if (has_yarn_lock) { name ||= 'yarn'; }
		if (name) { break; }
	}

	name ||= 'npm';

	const lockfilesCount = Number(has_npm_lock) + Number(has_pnpm_lock) + Number(has_yarn_lock);
	return {
		name: detectedPackageManagerNames[0] || 'npm',
		multipleLockFilesDetected: lockfilesCount > 1
	};
}
