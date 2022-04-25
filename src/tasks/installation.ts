import { LisaType, job } from '../utils/lisa_ex';
import { join } from 'path';
import { mkdirs, remove } from 'fs-extra';

import extendExec from '../utils/extendExec';
import { getEnv, invalidateEnv } from '../env';
import { PLUGIN_HOME } from '../env/config';

import python from '@binary/python-3.9';
import venv from '../venv';

import { installMinGW } from '../utils/mingw';

export default ({ cmd }: LisaType) => {
  job('install', {
    title: '环境安装',
    async task(ctx, task) {
      const exec = extendExec(cmd, { task });

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
    },
  });

  job('uninstall', {
    title: '环境卸载',
    async task(ctx, task) {
      await remove(PLUGIN_HOME);
    },
  });
};
