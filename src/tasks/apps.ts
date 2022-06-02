import { copy } from '@listenai/lisa_core/lib/fs';
import { runner } from '@listenai/lisa_core/lib/task';
import { existsSync, lstatSync } from 'fs';
import { mkdir, readdir, readFile, writeFile } from 'fs/promises';
import { ParsedArgs } from 'minimist';
import { join } from 'path';
import { EggInfo, readEggInfo } from '../utils/eggInfo';
import { job, LisaType } from '../utils/lisa_ex';

const APPS_PATH = 'build/apps-temp';
const PY_PATH = 'py';

export default ({ application }: LisaType) => {
  job('app', {
    async task(ctx, task) {
      const argv = application.argv as ParsedArgs;
      if (argv._.length < 2 || (!argv._.includes('flash'))) {
        throw new Error('缺少flash参数');
      }

      const checkAppsStatification = () => {
        const existSdk = existsSync('py/_slash_lib/mpy_app_sdk');
        const existPy = existsSync('py');
        const existApps = existsSync('py/apps');
        const existConf = existsSync('prj.conf');
        const existCmake = existsSync('CMakeLists.txt');
        if (!(existSdk && existPy && existApps && existConf && existCmake)) {
          throw new Error('当前项目不满足小应用项目结构');
        }
      };

      checkAppsStatification();

      const force = argv.force || argv.f;

      const buildDir = join(process.cwd(), 'build');
      if (!existsSync(buildDir)) {
        throw new Error('没有找到build目录, 请先执行 lisa mpy build -b <board>命令');
      }

      /**
       * create temp apps directory
       */
      const appsPath = join(process.cwd(), APPS_PATH);
      if (!existsSync(appsPath)) {
        await mkdir(appsPath);
      }

      const egg1 = await readEggInfo('py/_slash_lib/packages-egg-info');
      const egg2 = await readEggInfo(`${APPS_PATH}/_slash_lib/packages-egg-info`);
      /**
       * merge egg info
       */
      const eggInfo = { ...egg1.eggInfo, ...egg2.eggInfo };

      /**
       * move py dir to build/apps-temp dir
       */
      await copy(PY_PATH, APPS_PATH);
      await writeFile(`${APPS_PATH}/_slash_lib/packages-egg-info`, JSON.stringify(eggInfo));

      const files: string[] = [];
      const searchFile = async (dir: string): Promise<void> => {
        const fileList = await readdir(dir);
        for (const item of fileList) {
          if (item === 'manifest.json') {
            files.push(join(dir, item));
          }

          const subDir = join(dir, item);
          const isDirectory = lstatSync(subDir).isDirectory();
          if (!isDirectory) {
            continue;
          }

          await searchFile(subDir);
        }
      };

      const appsDir = join(APPS_PATH);
      /**
       * find manifest.json
       */
      await searchFile(appsDir);

      const makeArgs = async (files: string[]): Promise<{ path: string, args: Array<{ name: string, version: string }> }> => {
        const libArgs: { path: string, args: Array<{ name: string, version: string }> } = {
          path: join(APPS_PATH, '_slash_lib'),
          args: []
        }
        for (const file of files) {
          const data = await readFile(file);
          const manifest = JSON.parse(data.toString());
          if (!manifest.libs) {
            continue;
          }

          for (const name in manifest.libs) {
            let version = manifest.libs[name];
            if (force) {
              version = '*';
            }

            const lib = libArgs.args.find(item => item.name === name);
            if (!lib) {
              libArgs.args.push({ name, version });
            } else if (lib.version !== version && !force) {
              throw new Error(`当前存在小应用引用了 ${name} 的不同版本，请检查对应依赖，或使用 lisa mpy app flash --force 强制执行`);
            }
          }
        }

        return libArgs;
      }

      const libArgs = await makeArgs(files);

      const findInstallPackage = async (): Promise<Array<{ name: string, version: string }>> => {
        const pkgArgs: Array<{ name: string, version: string }> = [];
        const { eggInfo } = await readEggInfo(join(APPS_PATH, '_slash_lib', 'packages-egg-info'));
        for (let i = 0; i < libArgs.args.length; i++) {
          const lib = libArgs.args[i];
          const egg = eggInfo[lib.name];
          if (!egg) {
            pkgArgs.push(lib);
          }
        }
        return pkgArgs;
      }

      if (!force) {
        //check if there is any package not installed
        libArgs.args = await findInstallPackage();
      }

      if (libArgs.args.length > 0) {
        await runner('pip:install', libArgs);
      }

      const context: any = await runner('fs:build', { buildPath: APPS_PATH });

      context.build = false; //already build, no need to build again
      await runner('fs:flash', context);
    }
  });
}
