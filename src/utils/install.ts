import { join } from 'path';
import { mkdirs } from 'fs-extra';
import { ExecaChildProcess, Options } from 'execa';

import { getEnv, invalidateEnv } from '../env';
import { PLUGIN_HOME } from '../env/config';

import python from '@binary/python-3.9';
import venv from '../venv';

import { installMinGW } from '../utils/mingw';

export async function install(exec: (
  file: string,
  args?: string[],
  opts?: Options<string>
) => ExecaChildProcess<string>): Promise<void> {
  await mkdirs(PLUGIN_HOME);

  await invalidateEnv();

  await exec(join(python.binaryDir, 'python'), [
    '-m',
    'venv',
    venv.homeDir,
    '--upgrade-deps',
  ]);

  await exec('python', ['-m', 'pip', 'install', 'mpremote'], {
    env: await getEnv(),
  });
  await exec('python', ['-m', 'pip', 'install', 'mpy-cross'], {
    env: await getEnv(),
  });

  if (process.platform === 'win32') {
    await installMinGW();
  }

  await invalidateEnv();
}
