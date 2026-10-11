import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { parseCargoVersion, syncVersions } from './sync-version';

describe('parseCargoVersion', () => {
	it('extracts package version from Cargo.toml content', () => {
		const toml = `
[package]
name = "rusticker-core"
version = "0.2.1"
edition = "2024"
`;
		expect(parseCargoVersion(toml)).toBe('0.2.1');
	});

	it('throws error when version is missing', () => {
		const toml = `
[package]
name = "rusticker-core"
edition = "2024"
`;
		expect(() => parseCargoVersion(toml)).toThrow('Could not find version field in Cargo.toml');
	});
});

describe('syncVersions', () => {
	let dir: string;

	afterEach(() => {
		if (dir) {
			rmSync(dir, { recursive: true, force: true });
		}
	});

	function setupFiles(cargoVersion: string, pkgVersion: string) {
		dir = mkdtempSync(join(tmpdir(), 'sync-version-'));
		const cargoPath = join(dir, 'Cargo.toml');
		const packageJsonPath = join(dir, 'package.json');

		writeFileSync(cargoPath, `[package]\nname = "test"\nversion = "${cargoVersion}"\n`);
		writeFileSync(
			packageJsonPath,
			JSON.stringify({ name: 'web', version: pkgVersion }, null, '\t') + '\n'
		);

		return { cargoPath, packageJsonPath };
	}

	it('updates package.json when versions differ', () => {
		const { cargoPath, packageJsonPath } = setupFiles('0.2.0', '0.1.0');
		const result = syncVersions({ cargoPath, packageJsonPath });
		expect(result.updated).toBe(true);
		expect(result.cargoVersion).toBe('0.2.0');
		expect(result.packageVersion).toBe('0.2.0');
	});

	it('does not update package.json when already in sync', () => {
		const { cargoPath, packageJsonPath } = setupFiles('0.2.0', '0.2.0');
		const result = syncVersions({ cargoPath, packageJsonPath });
		expect(result.updated).toBe(false);
	});

	it('throws error in check-only mode when versions differ', () => {
		const { cargoPath, packageJsonPath } = setupFiles('0.2.0', '0.1.0');
		expect(() => syncVersions({ cargoPath, packageJsonPath, checkOnly: true })).toThrow(
			/Version mismatch/
		);
	});

	it('passes in check-only mode when versions match', () => {
		const { cargoPath, packageJsonPath } = setupFiles('0.2.0', '0.2.0');
		const result = syncVersions({ cargoPath, packageJsonPath, checkOnly: true });
		expect(result.updated).toBe(false);
		expect(result.cargoVersion).toBe('0.2.0');
	});
});
