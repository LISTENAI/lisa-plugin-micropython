import { remove } from 'fs-extra';
import { PLUGIN_HOME } from '../env/config';
import extendExec from '../utils/extendExec';
import { install } from '../utils/install';
import { job, LisaType } from '../utils/lisa_ex';

export default ({ cmd }: LisaType) => {
  job('install', {
    title: '环境安装',
    async task(ctx, task) {
      const exec = extendExec(cmd, { task });

      await install(exec);
    },
  });

  job('uninstall', {
    title: '环境卸载',
    async task(ctx, task) {
      await remove(PLUGIN_HOME);
    },
  });
};
