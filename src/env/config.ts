import { pathExists, readJson, writeJson } from 'fs-extra';
import { homedir } from 'os';
import { join } from 'path';

export const PLUGIN_HOME = join(homedir(), '.listenai', 'lisa-micropython');
export const NODE_MODULE_HOME = join(homedir(), '.listenai', 'lisa', 'node_modules');

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
