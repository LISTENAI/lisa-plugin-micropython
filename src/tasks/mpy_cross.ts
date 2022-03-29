import { LisaType, job } from '../utils/lisa_ex';

import { getEnv } from '../env';

export default ({ cmd }: LisaType) => {
  job('cross', {
    title: '编译为 mpy',
    async task(ctx, task) {
      task.title = '';
      const argv = process.argv.slice(4);
      await cmd('python', ['-m', 'mpy_cross', ...argv], {
        stdio: 'inherit',
        env: await getEnv(),
      });
    },
  });
};
