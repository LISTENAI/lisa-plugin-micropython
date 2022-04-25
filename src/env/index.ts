import LISA from '@listenai/lisa_core';
import { Bundle, Flasher } from '@lisa-env/type';
import { Binary } from '@binary/type';
import { delimiter, join } from 'path';
import { uniq, defaults } from 'lodash';
import { pathExists, readJson, outputJson, remove } from 'fs-extra';

import { KEY_OF_PATH, SYSTEM_PATHS, makePath, splitPath } from '../utils/path';
import { getMinGWEnv } from '../utils/mingw';
import typedImport from '../utils/typedImport';

import { PLUGIN_HOME, ZEP_PLUGIN_HOME, get } from './config';

export const PACKAGE_HOME = join(PLUGIN_HOME, 'packages');
const PACKAGE_MODULES_DIR = join(PACKAGE_HOME, 'node_modules');

const ENV_CACHE_DIR = join(PLUGIN_HOME, 'envs');
const ZEP_ENV_CACHE_DIR = join(ZEP_PLUGIN_HOME, 'envs');

const PIP_INDEX_URL =
  process.env.PIP_INDEX_URL || 'https://pypi.tuna.tsinghua.edu.cn/simple';

const BUILTIN_BINARIES = ['../venv'];

export async function getBuildEnv(
  override?: string
): Promise<Record<string, string>> {
  const escape = (name: string) =>
    name.replaceAll('/', '_').replaceAll('\\', '_');
  const cacheName = override ? `cache_${escape(override)}.json` : 'cache.json';
  const zepCacheFile = join(ZEP_ENV_CACHE_DIR, cacheName);
  const cacheFile = join(ENV_CACHE_DIR, cacheName);
  let zepEnv: Record<string, string> = {};
  if (await pathExists(zepCacheFile)) {
    zepEnv = await readJson(zepCacheFile);
  } else {
    throw new Error('Zephyr 环境未设置');
  }
  let env: Record<string, string> = {};
  if (await pathExists(cacheFile)) {
    env = await readJson(cacheFile);
  } else {
    env = await makeEnv(override);
    await outputJson(cacheFile, env);
  }
  Object.assign(
    env,
    zepEnv,
    makePath([
      ...splitPath(zepEnv[KEY_OF_PATH]),
      ...splitPath(env[KEY_OF_PATH]),
      ...SYSTEM_PATHS,
    ])
  );
  return env;
}
/**
 *
 * @deprecated Should replace with lisa_core version
 * @param override
 * @returns
 */
export async function getEnv(
  override?: string
): Promise<Record<string, string>> {
  const escape = (name: string) =>
    name.replaceAll('/', '_').replaceAll('\\', '_');
  const cacheName = override ? `cache_${escape(override)}.json` : 'cache.json';
  const cacheFile = join(ENV_CACHE_DIR, cacheName);
  if (await pathExists(cacheFile)) {
    const env = await readJson(cacheFile);
    Object.assign(
      env,
      makePath([...splitPath(env[KEY_OF_PATH]), ...SYSTEM_PATHS])
    );
    return env;
  } else {
    const env = await makeEnv(override);
    await outputJson(cacheFile, env);
    Object.assign(
      env,
      makePath([...splitPath(env[KEY_OF_PATH]), ...SYSTEM_PATHS])
    );
    return env;
  }
}

export async function invalidateEnv(): Promise<void> {
  await remove(ENV_CACHE_DIR);
}

export async function getFlasher(
  override?: string
): Promise<Flasher | undefined> {
  const envs = (await get('env')) || [];
  if (override) envs.unshift(override);
  const bundles = await loadBundles(uniq(envs));
  if (bundles.length == 0) return undefined;
  return bundles[0].flasher;
}

export async function loadBundles(envs?: string[]): Promise<Bundle[]> {
  if (!envs) return [];
  try {
    return await Promise.all(
      envs.map((name) =>
        typedImport<Bundle>(`${PACKAGE_MODULES_DIR}/@lisa-env/${name}`)
      )
    );
  } catch (e) {
    return [];
  }
}

export async function loadBinaries(
  bundles?: Bundle[]
): Promise<Record<string, Binary>> {
  const binaries: Record<string, Binary> = {};
  for (const name of BUILTIN_BINARIES) {
    const unprefixedName = name.split('/').slice(1).join('/');
    binaries[unprefixedName] = await typedImport<Binary>(name);
  }
  for (const bundle of bundles || []) {
    for (const name of bundle.binaries || []) {
      binaries[name] = await typedImport<Binary>(
        `${PACKAGE_MODULES_DIR}/@binary/${name}`
      );
    }
  }
  return binaries;
}

async function makeEnv(override?: string): Promise<Record<string, string>> {
  const env: Record<string, string> = {};
  const binaries: string[] = [];
  const libraries: string[] = [];

  const envs = (await get('env')) || [];
  if (override) envs.unshift(override);
  const bundles = await loadBundles(uniq(envs));

  for (const binary of Object.values(await loadBinaries(bundles))) {
    if (binary.env) {
      Object.assign(env, binary.env);
    }
    binaries.push(binary.binaryDir);
    if (binary.libraryDir) {
      libraries.push(binary.libraryDir);
    }
  }

  binaries.push(PACKAGE_HOME);

  const minGWEnv = getMinGWEnv();
  for (const key of Object.keys(minGWEnv)) {
    // if array
    if (Array.isArray(minGWEnv[key])) {
      binaries.push(...minGWEnv[key]);
    } else {
      const value = minGWEnv[key];
      // if string
      if (typeof value === 'string') {
        env[key] = value;
      }
    }
  }

  const sdk = await get('sdk');
  if (sdk) {
    env['MICROPY_SDK'] = sdk.replaceAll('\\', '/');
  }

  env['MICROPY_MPYCROSS'] = join(
    PLUGIN_HOME,
    'venv',
    'bin',
    'mpy-cross'
  ).replaceAll('\\', '/');

  Object.assign(env, {
    PIP_INDEX_URL,
  });

  if (bundles.length > 0) {
    const masterBundle = bundles[0];
    Object.assign(env, masterBundle.env);
    for (const bundle of bundles.slice(1)) {
      defaults(env, bundle.env);
    }
  }

  Object.assign(env, makePath(binaries));

  return env;
}
