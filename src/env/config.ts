import { pathExists, readJson, writeJson } from 'fs-extra';
import { join } from 'path';
import { homedir } from 'os';
import { PathLike } from 'fs';

export const PLUGIN_HOME = join(homedir(), '.listenai', 'lisa-micropython');
export const ZEP_PLUGIN_HOME = join(homedir(), '.listenai', 'lisa-zephyr');

const CONFIG_FILE = join(PLUGIN_HOME, 'config.json');
const ZEPHYR_CONFIG_FILE = join(
  PLUGIN_HOME,
  '..',
  'lisa-zephyr',
  'config.json'
);

interface IPluginConfig {
  env?: string[];
  sdk?: string;
}

async function load<T>(configFile = CONFIG_FILE): Promise<T | null> {
  if (!(await pathExists(configFile))) return null;
  return await readJson(configFile);
}

export async function getFromZep<K extends keyof IPluginConfig>(
  key: K
): Promise<IPluginConfig[K]> {
  const config = await load<IPluginConfig>(ZEPHYR_CONFIG_FILE);
  if (config && typeof config.env == 'string') {
    config.env = [config.env]; // 向后兼容
  }
  return config ? config[key] : undefined;
}

export async function get<K extends keyof IPluginConfig>(
  key: K
): Promise<IPluginConfig[K]> {
  const config = await load<IPluginConfig>();
  if (config && typeof config.env == 'string') {
    config.env = [config.env]; // 向后兼容
  }
  return config ? config[key] : undefined;
}

export async function set<K extends keyof IPluginConfig>(
  key: K,
  val: IPluginConfig[K]
): Promise<void> {
  const config = (await load<IPluginConfig>()) || {};
  config[key] = val;
  await writeJson(CONFIG_FILE, config);
}
