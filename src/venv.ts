import { join } from 'path';
import { promisify } from 'util';
import { execFile as _execFile } from 'child_process';
import { Binary } from '@binary/type';
import { PLUGIN_HOME } from './env/config';
import { getEnv } from './env';
import { Application } from '@listenai/lisa_core';

const execFile = promisify(_execFile);

const HOME = join(PLUGIN_HOME, 'venv');

export default <Binary>{
  homeDir: HOME,

  binaryDir: join(HOME, process.platform == 'win32' ? 'Scripts' : 'bin'),

  env: {
    VIRTUAL_ENV: HOME,
  },

  async version() {
    const { stdout } = await execFile(join(this.binaryDir, 'python'), [
      '--version',
    ]);
    return stdout.split('\n')[0].trim();
  },
};

function scriptDir() {
  return process.platform == 'win32' ? 'Scripts' : 'bin';
}

export async function venvScripts(name?: string): Promise<string> {
  const env = await getEnv();
  const venv = env['VIRTUAL_ENV'];
  return join(venv, scriptDir(), name || '');
}

export async function venvZepScripts(
  application: Application,
  name?: string
): Promise<string> {
  const zephyr = await application.getPluginByName('zephyr');
  if (!zephyr || !zephyr.env) {
    throw new Error('Zephyr plugin not found');
  }
  const venv = zephyr.env['VIRTUAL_ENV'];
  return join(venv, scriptDir(), name || '');
}
