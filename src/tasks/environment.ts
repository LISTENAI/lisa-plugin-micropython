import { LisaType, job } from '../utils/lisa_ex';
import { ParsedArgs } from 'minimist';
import { resolve, join } from 'path';
import { mkdirs } from 'fs-extra';
import { isEqual } from 'lodash';

import { PACKAGE_HOME, loadBundles, getEnv, invalidateEnv } from '../env';
import { get, set } from '../env/config';

import parseArgs from '../utils/parseArgs';
import extendExec from '../utils/extendExec';
import { zephyrVersion } from '../utils/sdk';
import { getRepoStatus } from '../utils/repo';
import simpleGit, {
  CloneOptions,
  GitError,
  SimpleGitProgressEvent,
} from 'simple-git';
import { GitExecutorResult } from 'simple-git/dist/src/lib/types';

const defaultGitRepo =
  'git@git.iflyos.cn:venus/zephyr/micropython/lv_micropython.git';

export default ({ application, cmd }: LisaType) => {
  job('use-sdk', {
    title: 'SDK 设置',
    after: (ctx) => [application.tasks['install']],
    async task(ctx, task) {
      task.title = '';

      const exec = extendExec(cmd, { task });
      const argv = application.argv as ParsedArgs;
      const path = argv._[1];
      const current = await get('sdk');
      const target = path || current;

      const { args, printHelp } = parseArgs(application.argv, {
        'from-git': { arg: 'url#ref', help: '从指定仓库及分支初始化 SDK' },
        'task-help': { short: 'h', help: '打印帮助' },
      });

      let gitRepo = defaultGitRepo;
      if (args['from-git']) {
        gitRepo = args['from-git'];
      }

      if (!path) {
        throw new Error(`SDK 路径是必传参数`);
      }

      // await exec('git', ['clone', gitRepo, path, '--recursive']);

      const errors = (
        error: Buffer | Error | undefined,
        result: Omit<GitExecutorResult, 'rejection'>
      ): Buffer | Error | undefined => {
        if (error instanceof Error) {
          throw error;
        } else if (error instanceof Buffer) {
          throw new Error(error.toString());
        }
        if (result.exitCode == 0) return error;
        throw new Error(result.stdErr.toString());
      };
      const progress = (event: SimpleGitProgressEvent) => {
        task.output = `安装 SDK: ${event.stage} ${event.processed}/${event.total} ${event.progress}%`;
      };
      const gitOptions = { progress, errors };
      await simpleGit(gitOptions).clone(gitRepo, path, [
        '-b',
        'listenai-simpilify',
        '--depth=1',
      ]);

      await exec(
        'git',
        ['submodule', 'update', '--init', '--recursive', '--depth=1'],
        {
          cwd: join(process.cwd(), path),
        }
      );

      await set('sdk', join(process.cwd(), path));

      task.title = 'SDK 设置成功';
    },
  });
};
