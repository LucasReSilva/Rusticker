import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

export interface SyncOptions {
	cargoPath?: string;
	packageJsonPath?: string;
	checkOnly?: boolean;
}

export function parseCargoVersion(cargoTomlContent: string): string {
	const match = cargoTomlContent.match(/^version\s*=\s*"([^"]+)"/m);
	if (!match || !match[1]) {
		throw new Error('Could not find version field in Cargo.toml');
	}
	return match[1].trim();
}

export function syncVersions(options: SyncOptions = {}): {
	cargoVersion: string;
	packageVersion: string;
	updated: boolean;
} {
	const defaultCargoPath = resolve(import.meta.dirname, '../../core/Cargo.toml');
	const defaultPackageJsonPath = resolve(import.meta.dirname, '../package.json');

	const cargoPath = options.cargoPath ?? defaultCargoPath;
	const packageJsonPath = options.packageJsonPath ?? defaultPackageJsonPath;
	const checkOnly = options.checkOnly ?? false;

	const cargoContent = readFileSync(cargoPath, 'utf8');
	const cargoVersion = parseCargoVersion(cargoContent);

	const pkgContent = readFileSync(packageJsonPath, 'utf8');
	const pkg = JSON.parse(pkgContent) as { version?: string; [key: string]: unknown };
	const currentPkgVersion = pkg.version ?? '';

	if (checkOnly) {
		if (currentPkgVersion !== cargoVersion) {
			throw new Error(
				`Version mismatch: core/Cargo.toml is ${cargoVersion} but web/package.json is ${currentPkgVersion}`
			);
		}
		return { cargoVersion, packageVersion: currentPkgVersion, updated: false };
	}

	if (currentPkgVersion === cargoVersion) {
		return { cargoVersion, packageVersion: currentPkgVersion, updated: false };
	}

	pkg.version = cargoVersion;
	const formattedJson = `${JSON.stringify(pkg, null, '\t')}\n`;
	writeFileSync(packageJsonPath, formattedJson, 'utf8');

	return { cargoVersion, packageVersion: cargoVersion, updated: true };
}

// CLI entry point
if (import.meta.main || process.argv[1]?.endsWith('sync-version.ts')) {
	const isCheck = process.argv.includes('--check');
	try {
		const result = syncVersions({ checkOnly: isCheck });
		if (isCheck) {
			console.log(`[version:check] Versions match: ${result.cargoVersion}`);
		} else if (result.updated) {
			console.log(
				`[version:sync] Updated web/package.json to version ${result.cargoVersion} from core/Cargo.toml`
			);
		} else {
			console.log(`[version:sync] Versions already in sync (${result.cargoVersion})`);
		}
	} catch (err) {
		console.error(`[version:sync] Error: ${(err as Error).message}`);
		process.exit(1);
	}
}
