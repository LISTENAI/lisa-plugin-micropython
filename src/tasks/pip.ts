import { job, LisaType } from '../utils/lisa_ex';
import { join } from 'path';
import { existsSync } from 'fs';
import { ParsedArgs } from 'minimist';
import { mkdir, writeFile } from 'fs/promises';
import got from 'got';
import unzip from '../utils/unzip';

const PACKAGE_URL = 'https://micropython.org/pi';
const PACKAGE_PATH = 'py/_slash_lib';

export default ({ application }: LisaType) => {
  job('pip:install', {
    async task(ctx, task) {
      const prjPath = join(process.cwd(), 'prj.conf');
      const mainPath = join(process.cwd(), 'py/main.py');
      if (!(existsSync(prjPath)) && !(existsSync(mainPath))) {
        throw new Error('当前目录不是项目根目录');
      }

      const argv = (application.argv as ParsedArgs)._;
      if (argv.length < 2) {
        throw new Error('请指定要安装的库名');
      }
      const name = argv[argv.length - 1];

      task.title = `安装${name}`;

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

      /**
       * 1. get package info
       */
      const packageInfo = await getPackage(name);

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
       * 2. check and create package dircetory 
       */
      await createDirIfNotExist(PACKAGE_PATH);

      const download = async (url: string): Promise<Buffer> => {
        return await (await got.get(url)).rawBody;
      };

      /**
       * 3. download package
       */
      const data = await download(packageInfo.url);

      const installed: string[] = [];
      installed.push(name);

      /**
       * download and save dependencies package
       * @param deps 
       */
      const installDeps = async (deps: string[]): Promise<void> => {
        for (const dep of deps) {
          if (!installed.includes(dep)) {
            const pkgInfo = await getPackage(dep);

            const data = await download(pkgInfo.url);
            await install(data);

            installed.push(dep);
          }
        }
      };

      const install = async (data: Buffer): Promise<void> => {
        const zip = await unzip(data, 'PKG-INFO');
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
      };

      /**
       * 4. unzip and save package to package directory
       */
      await install(data);
    }
  });
}
