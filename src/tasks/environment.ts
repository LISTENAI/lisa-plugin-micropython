import { execFileSync } from 'child_process';
import { existsSync, rmSync } from 'fs-extra';
import { join, resolve } from 'path';
import simpleGit, { SimpleGitProgressEvent } from 'simple-git';
import { GitExecutorResult } from 'simple-git/dist/src/lib/types';
import { invalidateEnv } from '../env';
import { PLUGIN_HOME, set } from '../env/config';
import { job, LisaType } from '../utils/lisa_ex';
import { exec } from 'sudo-prompt';
import parseArgs from '../utils/parseArgs';

const defaultGitRepo = 'https://cloud.listenai.com/micropython/micropython.git';

/**
 * 在 Windows 上，默认 clone 可能导致无法创建软链接。
 * 需要使用管理员权限来执行，辅以 -c core.symlinks=true 参数。
 * @param repo git 仓库地址
 * @param path 安装路径
 * @returns 
 */
async function elevateGitClone(repo: String, path: String): Promise<void> {
  return new Promise((resolve, reject) => {
    exec(`git -c core.symlinks=true clone ${repo} ${path}  --depth=1`, {}, (err, stdout, stderr) => {
      if (err) {
        reject(err);
      } else {
        resolve();
      }
    });
  });
}

export default ({ application, cmd }: LisaType) => {
  job('use-sdk', {
    title: 'SDK 设置',
    async task(ctx, task) {
      const { args, printHelp } = parseArgs(application.argv, {
        path: { arg: 'path', help: '指定本地存放 SDK 的目录' },
        'from-git': { arg: 'url#ref', help: '从指定仓库及分支初始化 SDK' },
        'task-help': { short: 'h', help: '打印帮助' },
        force: { short: 'f', help: '强制使用 path 声明的目录作为 SDK 路径' },
        update: { short: 'u', help: '更新本地 SDK 目录' },
      });

      if (args['task-help']) {
        printHelp();
        return;
      }

      if (args.force) {
        if (!args.path) {
          throw new Error('使用 force 参数时，要求 path 不为空');
        }
      }

      const defaultPath = join(PLUGIN_HOME, 'sdk');

      const path = args['path'] || defaultPath;
      const target = resolve(path);

      if (args.force) {
        await invalidateEnv();
        await set('sdk', target);
        task.title = '设置 SDK 成功';
      } else {
        task.title = '';
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
              if (process.platform === 'win32') {
                await elevateGitClone(gitRepo, path);
              } else {
                await simpleGit(gitOptions).clone(gitRepo, path, ['--depth=1']);
              }
            }
          } else {
            console.log('拉取最新 SDK ...');
            if (process.platform === 'win32') {
              await elevateGitClone(gitRepo, path);
            } else {
              await simpleGit(gitOptions).clone(gitRepo, path, ['--depth=1']);
            }
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
      }
    },
  });
};
