import { job, LisaType } from '../utils/lisa_ex';
import { join } from 'path';
import { existsSync, lstatSync } from 'fs';
import { ParsedArgs } from 'minimist';
import { mkdir, writeFile, readdir, unlink, readFile, rmdir } from 'fs/promises';
import got from 'got';
import unzip from '../utils/unzip';

const PACKAGE_URL = 'https://micropython.org/pi';
const PACKAGE_PATH = 'py/_slash_lib';

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

  job('pip:install', {
    async task(ctx, task) {
      check();

      const deps = getArgs();

      task.title = `安装${deps}`;

      const getPackage = async (name: string): Promise<{ version: string, url: string }> => {
        const reqUrl = `${PACKAGE_URL}/${name}/json`;
        const data = await (await got.get(reqUrl)).body;
        const result = JSON.parse(data);
        const urls = result.releases[result.info.version]
        return {
          version: result.info.version,
          url: urls[urls.length - 1].url
        };
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
            await install(data, dep);

            installed.push(dep);
          }
        }
      };

      /**
       * unzip and save package to package directory
       */
      const install = async (data: Buffer, name: string): Promise<void> => {
        const zip = await unzip(data, 'PKG-INFO');
        let fileList = '';
        let eggFilePath = '';
        for (const [path, buffer] of Object.entries(zip)) {
          const items = path.split('/').filter(item => item.length > 0);
          const pyPath = path.replaceAll(`${items[0]}/`, '');

          const isRequires = path.match(/requires.txt/);

          if (!isRequires) {
            const subPath = path.match('/.+/');
            if (subPath) {
              const libPath = join(PACKAGE_PATH, subPath[0]);
              await createDirIfNotExist(libPath);
              eggFilePath = `${libPath}/${name}-egg-info`;
            } else {
              eggFilePath = `${PACKAGE_PATH}/${name}-egg-info`;
            }

            const file = join(PACKAGE_PATH, pyPath);
            fileList += `${file}\n`;

            await writeFile(file, buffer);

            await writeFile(eggFilePath, fileList);
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
      };

      await installDeps(deps);
    }
  });

  job('pip:uninstall', {
    async task(ctx, task) {
      check();

      const deps = getArgs();

      task.title = `卸载${deps}`;

      const searchFile = async (dir: string, file: string): Promise<string | null> => {
        const files = await readdir(dir);
        for (const item of files) {
          if (item === `${file}-egg-info`) {
            return join(dir, item);
          }

          const subDir = join(dir, item);
          const isDirectory = lstatSync(subDir).isDirectory();
          if (!isDirectory) {
            continue;
          }

          const result = await searchFile(subDir, file);
          if (result) {
            return result;
          }
        }
        return null;
      };

      const uninstall = async (file: string): Promise<void> => {
        const subPath = file.match('/.+/');
        const data = await (await readFile(file)).toString();
        const pathList = data.split('\n').filter(item => item.length > 0);
        for (const item of pathList) {
          if (existsSync(item)) {
            await unlink(item);
          }
        }

        await unlink(file);

        if (subPath) {
          const subDir = subPath[0];
          const files = await readdir(subDir);
          if (files.length === 0) {
            await rmdir(subDir.slice(0, subDir.length - 1));
          }
        }
      }

      const dir = join(process.cwd(), PACKAGE_PATH);

      for (const dep of deps) {
        const file = await searchFile(dir, dep);
        if (file) {
          await uninstall(file);
        } else {
          throw new Error(`没有找到${dep}`);
        }
      }
    }
  });
}
