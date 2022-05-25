import { job, LisaType } from '../utils/lisa_ex';
import { join } from 'path';
import { existsSync, lstatSync } from 'fs';
import { ParsedArgs } from 'minimist';
import { mkdir, writeFile, readdir, unlink, readFile, rmdir } from 'fs/promises';
import got from 'got';
import unzip from '../utils/unzip';

const PACKAGE_URL = ['https://micropython.org/pi', 'https://pypi.org/pypi'];
const PACKAGE_PATH = 'py/_slash_lib';
const EGG_FILE_PATH = `${PACKAGE_PATH}/packages-egg-info`;

interface EggInfo {
  [name: string]: {
    version: string;
    sources: string[];
  }
}

export default ({ application }: LisaType) => {
  const check = () => {
    const prjPath = join(process.cwd(), 'prj.conf');
    const mainPath = join(process.cwd(), 'py/main.py');
    if (!(existsSync(prjPath)) && !(existsSync(mainPath))) {
      throw new Error('当前目录不是项目根目录');
    }
  };

  const getArgs = () => {
    const argv = (application.argv as ParsedArgs)._;
    if (argv.length < 2) {
      throw new Error('请指定要安装的库名');
    }
    return argv.slice(1, argv.length);
  };

  const readEggInfo = async (): Promise<{ eggFilePath: string, eggInfo: EggInfo }> => {
    const eggFilePath = join(process.cwd(), EGG_FILE_PATH);
    let eggInfo: EggInfo = {};
    if (existsSync(eggFilePath)) {
      const eggData = await readFile(eggFilePath);
      eggInfo = JSON.parse(eggData.toString());
    }
    return { eggFilePath, eggInfo };
  };

  job('pip:install', {
    async task(ctx, task) {
      check();

      const deps = getArgs();

      task.title = `安装${deps}`;

      const getPackage = async (name: string): Promise<{ version: string, url: string }> => {
        for (const url of PACKAGE_URL) {
          try {
            const response = await got.get(`${url}/${name}/json`);
            const result = JSON.parse(response.body);
            const urls = result.releases[result.info.version];
            return {
              version: result.info.version,
              url: urls[urls.length - 1].url
            };
          } catch (error) {
          }
        }

        throw new Error(`${name}不存在`);
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

      const { eggFilePath, eggInfo } = await readEggInfo();

      const installed: string[] = [];

      /**
       * download and save dependencies package
       * @param deps 
       */
      const installDeps = async (deps: string[]): Promise<void> => {
        for (const dep of deps) {
          if (!installed.includes(dep)) {
            const pkgInfo = await getPackage(dep);

            const data = await download(pkgInfo.url);
            await install(data, dep, pkgInfo);

            installed.push(dep);
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
            const deps = buffer.toString().split('\n').filter(item => item.length > 0);
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

      const { eggFilePath, eggInfo } = await readEggInfo();

      for (const dep of deps) {
        const fileList = eggInfo[dep].sources;
        await uninstall(fileList);

        delete eggInfo[dep];
      }

      await writeFile(eggFilePath, JSON.stringify(eggInfo));
    }
  });
}
