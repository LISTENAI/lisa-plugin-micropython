import { promisify } from 'util';
import { execFile as _execFile, ExecFileOptions } from 'child_process';
import { defaults } from 'lodash';
import { pathExists } from 'fs-extra';
import { loadBundles, loadBinaries, getEnv } from './env';
import { PLUGIN_HOME, get, getFromZep } from './env/config';
import { zephyrVersion, mpyVersion } from './utils/sdk';
import { getRepoStatus } from './utils/repo';
import Lisa from '@listenai/lisa_core';
import { platform } from 'os';

const execFile = promisify(_execFile);

export async function env(): Promise<Record<string, string>> {
  const env = await getFromZep('env');
  const bundles = await loadBundles(env);

  const versions: Record<string, string> = {};
  const variables: Record<string, string> = {};

  for (const [name, binary] of Object.entries(await loadBinaries(bundles))) {
    try {
      versions[name] = await binary.version();
    } catch (e) {
      versions[name] = '(缺失)';
    }
    Object.assign(variables, binary.env);
  }

  if (bundles.length > 0) {
    const masterBundle = bundles[0];
    Object.assign(variables, masterBundle.env);
    for (const bundle of bundles.slice(1)) {
      defaults(variables, bundle.env);
    }
  }

  return {
    zephyr_env: env && env.length > 0 ? env.join(', ') : '(未设置)',
    mpremote: (await getMPRemoteVersion()) || '(未安装)',
    lisa_zephyr: (await getZepPluginVersion()) || '(未安装)',
    ...versions,
    ZEPHYR_BASE: (await getZephyrInfo()) || '(未设置)',
    MICROPY_SDK: (await getMpyInfo()) || '(未设置)',
    PLUGIN_HOME,
    ...variables,
  };
}

async function getZepPluginVersion(): Promise<string | null> {
  try {
    const option: ExecFileOptions = {};
    if (platform() == 'win32') {
      option.shell = 'powershell';
    }

    const { stdout } = await execFile(
      'npm',
      ['list', '-g', '--depth=0'],
      option
    );
    return (
      stdout
        .trim()
        .split('\n')
        .find((line) => line.includes('@lisa-plugin/zephyr'))
        ?.split('@')
        .pop() || null
    );
  } catch (e) {
    return null;
  }
}

async function getMPRemoteVersion(): Promise<string | null> {
  try {
    const { stdout } = await execFile(
      'python',
      ['-m', 'pip', 'show', 'mpremote'],
      { env: await getEnv() }
    );
    return (
      stdout
        .trim()
        .split('\n')
        .find((line) => line.startsWith('Version: ')) || null
    );
  } catch (e) {
    return null;
  }
}

async function getZephyrInfo(): Promise<string | null> {
  const sdk = await getFromZep('sdk');
  if (!sdk) return null;
  if (!(await pathExists(sdk))) return null;
  const version = await zephyrVersion(sdk);
  const branch = await getRepoStatus(sdk);
  if (branch) {
    return `${sdk} (版本: ${version}, 分支: ${branch})`;
  } else {
    return `${sdk} (版本: ${version})`;
  }
}

async function getMpyInfo(): Promise<string | null> {
  const sdk = await get('sdk');
  if (!sdk) return null;
  if (!(await pathExists(sdk))) return null;
  const version = await mpyVersion(sdk);
  const branch = await getRepoStatus(sdk);
  if (branch) {
    return `${sdk} (版本: ${version}, 分支: ${branch})`;
  } else {
    return `${sdk} (版本: ${version})`;
  }
}

export const exportEnv = getEnv;

export async function undertake(argv?: string[] | undefined): Promise<void> {
  argv = argv ?? process.argv.slice(3);
  const { cmd } = Lisa;
  try {
    process.on('SIGINT', () => {
      // ignore
    });
    await cmd('mpremote', argv, {
      stdio: 'inherit',
      env: await getEnv(),
    });
  } catch (error) {}
}
