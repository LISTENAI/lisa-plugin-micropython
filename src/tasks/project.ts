import { getEnv, getZepEnv } from '../env';
import { job, LisaType } from '../utils/lisa_ex';
import parseArgs from '../utils/parseArgs';
import { venvZepScripts } from '../venv';
import { flashFlags } from '../utils/westConfig';

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
        firmware: { help: '仅烧录固件' },
        fs: { help: '仅烧录文件系统' },
        'task-help': { short: 'h', help: '打印帮助' },
      });
      if (args['task-help']) {
        printHelp();
        return;
      }
      if (args['firmware'] && args['fs']) {
        throw new Error('不能同时使用 --fs 和 --firmware');
      }
      if (!args['fs']) {
        const argv = process.argv
          .slice(3)
          .filter((arg) => arg !== '--firmware');
        const env = Object.assign(await getEnv(), await getZepEnv());
        application.debug(env);
        await cmd(venvZepScripts('west'),  await flashFlags(argv), {
          stdio: 'inherit',
          env,
        });
      }

      if (!args['firmware']) {
        await runner('fs:flash');
      }
      task.title = '烧录结束';
    },
  });
};
