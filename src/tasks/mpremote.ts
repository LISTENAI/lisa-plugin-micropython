import { getEnv } from '../env';
import { get, set } from '../env/config';
import { job, LisaType } from '../utils/lisa_ex';

export default (lisa: LisaType) => {
  job('last', {
    title: '上一次连接设备',
    async task(ctx, task) {
      task.title = '';
      const last = await get('last_connect');
      if (!last) {
        throw new Error(
          '请先使用 lisa mpy connect 命令至少一次后，再使用此命令'
        );
      }
      const argv = process.argv.slice(4);
      const { cmd } = lisa;
      try {
        process.on('SIGINT', () => {
          // ignore
        });
        const args = [...last, ...argv];
        lisa.application.debug(args);
        await cmd('mpremote', args, {
          stdio: 'inherit',
          env: await getEnv(),
        });
      } catch (error) {}
    },
  });
  job('connect', {
    title: '连接设备',
    async task(ctx, task) {
      task.title = '';
      const argv = process.argv.slice(3);
      // save 2 arg
      await set('last_connect', argv.slice(0, 2));
      const { cmd } = lisa;
      try {
        process.on('SIGINT', () => {
          // ignore
        });
        await cmd('mpremote', argv, {
          stdio: 'inherit',
          env: await getEnv(),
        });
      } catch (error) {}
    },
  });
};
