import { execFileSync } from 'child_process';
import { existsSync, rmSync } from 'fs-extra';
import { join, resolve } from 'path';
import simpleGit, { SimpleGitProgressEvent } from 'simple-git';
import { GitExecutorResult } from 'simple-git/dist/src/lib/types';
import { invalidateEnv } from '../env';
import { PLUGIN_HOME, set } from '../env/config';
import { job, LisaType } from '../utils/lisa_ex';
import parseArgs from '../utils/parseArgs';

const defaultGitRepo = 'https://cloud.listenai.com/micropython/micropython.git';

export default ({ application, cmd }: LisaType) => {
  job('use-sdk', {
    title: 'SDK 设置',
    async task(ctx, task) {
      task.title = '';

      const { args, printHelp } = parseArgs(application.argv, {
        path: { arg: 'path', help: '指定本地存放 SDK 的目录' },
        'from-git': { arg: 'url#ref', help: '从指定仓库及分支初始化 SDK' },
        'task-help': { short: 'h', help: '打印帮助' },
        update: { short: 'u', help: '更新本地 SDK 目录' },
      });

      if (args['task-help']) {
        printHelp();
        return;
      }

      const defaultPath = join(PLUGIN_HOME, 'sdk');

      const path = args['path'] || defaultPath;
      const target = resolve(path);

      let gitRepo = defaultGitRepo;
      if (args['from-git']) {
        gitRepo = args['from-git'];
      }

      if (target && /.*[\u4e00-\u9fa5]+.*$/.test(target)) {
        throw new Error(`SDK 路径不能包含中文: ${target}`);
      }

      if (!args.update) {
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
          console.log(
            `'安装 SDK': ${event.stage} ${event.processed}/${event.total} ${event.progress}%`
          );
        };
        const gitOptions = { progress, errors };

        if (existsSync(path)) {
          console.log('SDK 路径不为空，尝试更新 SDK...');

          try {
            await cmd('git', ['pull'], {
              stdio: 'inherit',
              cwd: path,
            });
          } catch (e) {
            console.log('更新失败，尝试删除文件夹...');

            if (process.platform === 'win32') {
              await cmd('del', [target, '/s', '/q', '/f', '/a'], {
                stderr: 'inherit',
              });
            } else {
              rmSync(target, { recursive: true, force: true });
            }

            console.log('拉取最新 SDK ...');
            await simpleGit(gitOptions).clone(gitRepo, path, ['--depth=1']);
          }
        } else {
          console.log('拉取最新 SDK ...');
          await simpleGit(gitOptions).clone(gitRepo, path, ['--depth=1']);
        }

        console.log('更新子模块 ...');
        await cmd(
          'git',
          [
            'submodule',
            'update',
            '--force',
            '--init',
            '--recursive',
            '--depth=1',
          ],
          {
            cwd: target,
            stdio: 'inherit',
          }
        );
      } else {
        console.log('进行: 更新当前 SDK');
        console.log('拉取最新 SDK ...');
        await cmd('git', ['pull'], {
          stdio: 'inherit',
          cwd: target,
        });
        console.log('更新子模块 ...');
        execFileSync('git', ['submodule', 'update', '--force'], {
          cwd: target,
          stdio: [process.stdin, process.stdout, process.stderr],
        });
      }

      invalidateEnv();

      await set('sdk', target);
      console.log(args.update ? '更新 SDK 成功' : '设置 SDK 成功');

      task.title = '';
    },
  });
};
