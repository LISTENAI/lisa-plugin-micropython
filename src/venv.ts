import { join } from 'path';
import { promisify } from 'util';
import { execFile as _execFile } from 'child_process';
import { Binary } from '@binary/type';
import { PLUGIN_HOME, ZEP_PLUGIN_HOME } from './env/config';

const execFile = promisify(_execFile);

const HOME = join(PLUGIN_HOME, 'venv');
const ZEP_HOME = join(ZEP_PLUGIN_HOME, 'venv');

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

export function venvScripts(name?: string, home = HOME): string {
  return join(home, scriptDir(), name || '');
}

export function venvZepScripts(name?: string): string {
  return venvScripts(name, ZEP_HOME);
}
