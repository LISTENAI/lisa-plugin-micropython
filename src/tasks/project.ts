import { LisaType, job } from '../utils/lisa_ex';
import parseArgs from '../utils/parseArgs';

import { getEnv, getZepEnv } from '../env';

// import parseArgs from '../utils/parseArgs';
// import extendExec from '../utils/extendExec';
// import { getFlashArgs, toHex } from '../utils/flash';

export default ({ application, cmd, runner }: LisaType) => {
  job('build', {
    title: '构建',
    async task(ctx, task) {
      task.title = '';
      const argv = process.argv.slice(3);
      const env = Object.assign(await getEnv(), await getZepEnv());
      application.debug(env);
      await cmd('python', ['-m', 'west', ...argv], {
        stdio: 'inherit',
        env,
      });
    },
  });
  job('flash', {
    title: '烧录',
    async task(ctx, task) {
      task.title = '';
      const { args, printHelp } = parseArgs(application.argv, {
        'fs-only': { help: '仅烧录文件系统' },
        'task-help': { short: 'h', help: '打印帮助' },
      });
      if (args['task-help']) {
        printHelp();
        return;
      }
      if (!args['fs-only']) {
        const argv = process.argv.slice(3);
        const env = Object.assign(await getEnv(), await getZepEnv());
        application.debug(env);
        await cmd('python', ['-m', 'west', ...argv], {
          stdio: 'inherit',
          env,
        });
      }

      await runner('fs:flash');
    },
  });
};
