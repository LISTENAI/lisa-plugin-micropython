import { join } from 'path';
import simpleGit, { SimpleGitProgressEvent } from 'simple-git';
import { GitExecutorResult } from 'simple-git/dist/src/lib/types';
import { get, PLUGIN_HOME, set } from '../env/config';
import extendExec from '../utils/extendExec';
import { job, LisaType } from '../utils/lisa_ex';
import parseArgs from '../utils/parseArgs';
import { existsSync, rmdirSync } from 'fs-extra';

const defaultGitRepo = 'https://cloud.listenai.com/micropython/micropython.git';

export default ({ application, cmd }: LisaType) => {
  job('use-sdk', {
    title: 'SDK 设置',
    async task(ctx, task) {
      task.title = '';

      const exec = extendExec(cmd, { task });
      const current = await get('sdk');

      const { args, printHelp } = parseArgs(application.argv, {
        path: { arg: 'path', help: '指定本地存放 SDK 的目录' },
        'from-git': { arg: 'url#ref', help: '从指定仓库及分支初始化 SDK' },
        'task-help': { short: 'h', help: '打印帮助' },
      });

      if (args['task-help']) {
        task.title = 'SDK 帮助';

        printHelp();
        return;
      }

      const defaultPath = join(PLUGIN_HOME, 'sdk');

      const path = args['path'] || defaultPath;
      const target = path;

      let gitRepo = defaultGitRepo;
      if (args['from-git']) {
        gitRepo = args['from-git'];
      }

      if (target && /.*[\u4e00-\u9fa5]+.*$/.test(target)) {
        throw new Error(`SDK 路径不能包含中文: ${target}`);
      }

      if (existsSync(target)) {
        rmdirSync(target, { recursive: true });
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
      await simpleGit(gitOptions).clone(gitRepo, path, ['--depth=1']);

      await exec(
        'git',
        ['submodule', 'update', '--init', '--recursive', '--depth=1'],
        {
          cwd: target,
        }
      );

      await set('sdk', target);

      task.title = 'SDK 设置成功';
    },
  });
};
