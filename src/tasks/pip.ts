import { job, LisaType } from '../utils/lisa_ex';
import { join } from 'path';
import { existsSync } from 'fs';
import { ParsedArgs } from 'minimist';
import { mkdir, writeFile, readdir, unlink, readFile, rmdir } from 'fs/promises';
import got from 'got';
import unzip from '../utils/unzip';
import { readEggInfo } from '../utils/eggInfo';

const PACKAGE_URL = ['https://micropython.org/pi', 'https://pypi.org/pypi'];
let PACKAGE_PATH = 'py/_slash_lib';
let EGG_FILE_PATH = `${PACKAGE_PATH}/packages-egg-info`;

export default ({ application }: LisaType) => {
  const check = () => {
    const prjPath = join(process.cwd(), 'prj.conf');
    const mainPath = join(process.cwd(), 'py/main.py');
    if (!(existsSync(prjPath)) && !(existsSync(mainPath))) {
      throw new Error('当前目录不是项目根目录');
    }
  };

  const getArgs = (): Array<{ name: string, version: string }> => {
    const argv = (application.argv as ParsedArgs)._;
    if (argv.length < 2) {
      throw new Error('请指定要安装的库名');
    }
    const args = argv.slice(1, argv.length);
    const argDict: Array<{ name: string, version: string }> = [];
    for (const arg of args) {
      const result = arg.split('==');
      argDict.push({
        name: result[0],
        version: result[1] || '*',
      });
    }
    return argDict;
  };

  job('pip:install', {
    async task(ctx, task) {
      check();

      let deps: Array<{ name: string, version: string }> = [];
      if (ctx.args) {
        deps = ctx.args;
        PACKAGE_PATH = ctx.path;
        EGG_FILE_PATH = `${PACKAGE_PATH}/packages-egg-info`;
      } else {
        deps = getArgs();
      }

      let title = '';
      for (const dep of deps) {
        title += `${dep.name} `;
      }
      task.title = `安装${title}`;

      const getPackage = async (dep: { name: string, version: string }): Promise<{ version: string, url: string }> => {
        for (const url of PACKAGE_URL) {
          try {
            const response = await got.get(`${url}/${dep.name}/json`);
            const result = JSON.parse(response.body);
            let version = '';
            if (dep.version === '*') {
              version = result.info.version;
            } else {
              version = dep.version.replace('*', '\S');
              const versions: string[] = [];
              for (const key in result.releases) {
                if (key.match(version)) {
                  versions.push(key);
                }
              }
              version = versions[versions.length - 1];
            }

            const urls = result.releases[version];
            return {
              version: result.info.version,
              url: urls[urls.length - 1].url
            };
          } catch (error) {
          }
        }

        throw new Error(`${dep.name} 版本 ${dep.version} 不存在`);
      };

      const createDirIfNotExist = async (dir: string): Promise<void> => {
        const pathList = dir.split('/').filter(item => item.length > 0);
        let currentPath = process.cwd();
        for (const item of pathList) {
          currentPath = join(currentPath, item);
          if (!existsSync(currentPath)) {
            await mkdir(currentPath);
          }
        }
      };

      /** 
       * check and create package dircetory 
       */
      await createDirIfNotExist(PACKAGE_PATH);

      const download = async (url: string): Promise<Buffer> => {
        return await (await got.get(url)).rawBody;
      };

      const { eggFilePath, eggInfo } = await readEggInfo(EGG_FILE_PATH);

      const installed: string[] = [];

      /**
       * download and save dependencies package
       * @param deps 
       */
      const installDeps = async (deps: Array<{ name: string, version: string }>): Promise<void> => {
        for (const dep of deps) {
          if (!installed.includes(dep.name)) {
            const pkgInfo = await getPackage(dep);

            const data = await download(pkgInfo.url);
            await install(data, dep.name, pkgInfo);

            installed.push(dep.name);
          }
        }
      };

      /**
       * unzip and save package to package directory
       */
      const install = async (data: Buffer, name: string, pkgInfo: { version: string, url: string }): Promise<void> => {
        const zip = await unzip(data, 'PKG-INFO');
        eggInfo[name] = { version: pkgInfo.version, sources: [] };
        for (const [path, buffer] of Object.entries(zip)) {
          const items = path.split('/').filter(item => item.length > 0);
          const pyPath = path.replaceAll(`${items[0]}/`, '');

          const isRequires = path.match(/requires.txt/);

          if (!isRequires) {
            const subPath = path.match('/.+/');
            if (subPath) {
              const libPath = join(PACKAGE_PATH, subPath[0]);
              await createDirIfNotExist(libPath);
            }

            const file = join(PACKAGE_PATH, pyPath);
            eggInfo[name].sources.push(file);

            await writeFile(file, buffer);
          }

          /**
           * install dependencies
           */
          if (path.match(/requires.txt/)) {
            //get dependencies
            const items = buffer.toString().split('\n').filter(item => item.length > 0);
            const deps: Array<{ name: string, version: string }> = [];
            for (const item of items) {
              deps.push({ name: item, version: '*' });
            }
            await installDeps(deps);
          }
        }

        await writeFile(eggFilePath, JSON.stringify(eggInfo));
      };

      await installDeps(deps);
    }
  });

  job('pip:uninstall', {
    async task(ctx, task) {
      check();

      const deps = getArgs();

      task.title = `卸载${deps}`;

      const uninstall = async (fileList: string[]): Promise<void> => {
        for (const file of fileList) {
          if (existsSync(file)) {
            await unlink(file);
          }

          const subPath = file.match('.+/');
          if (subPath) {
            const subDir = subPath[0].slice(0, subPath[0].length - 1);
            const files = await readdir(subDir);
            if (files.length === 0) {
              await rmdir(subDir);
            }
          }
        }
      }

      const { eggFilePath, eggInfo } = await readEggInfo(EGG_FILE_PATH);

      for (const dep of deps) {
        const fileList = eggInfo[dep.name].sources;
        await uninstall(fileList);

        delete eggInfo[dep.name];
      }

      await writeFile(eggFilePath, JSON.stringify(eggInfo));
    }
  });
}
