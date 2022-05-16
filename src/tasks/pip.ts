import { job, LisaType } from '../utils/lisa_ex';
import { join } from 'path';
import { existsSync } from 'fs';
import { ParsedArgs } from 'minimist';
import { mkdir, writeFile } from 'fs/promises';
import got from 'got';
import unzip from '../utils/unzip';

const PACKAGE_URL = 'https://micropython.org/pi';
const PACKAGE_PATH = 'py/_slash_lib';

export default ({ application, cmd, runner }: LisaType) => {
  job('pip:install', {
    title: '安装Micropython库',
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

      const getPackage = async (name: string): Promise<{ version: string, url: string }> => {
        const reqUrl = `${PACKAGE_URL}/${name}/json`;
        const data = await (await got.get(reqUrl)).body;
        const result = JSON.parse(data);
        return {
          version: result.info.version,
          url: result.releases[result.info.version][0].url
        };
      };

      /**
       * 1. get package info
       */
      const packageInfo = await getPackage(name);

      const createDirIfNotExist = async (dir: string) => {
        const path = join(process.cwd(), dir);
        const pathList = dir.split('/').filter(item => item.length > 0);
        let currentPath = process.cwd();
        pathList.forEach(async item => {
          currentPath = join(currentPath, item);
          if (!existsSync(currentPath)) {
            await mkdir(currentPath);
          }
        });
        return path;
      };

      /** 
       * 2. check and create package dircetory 
       */
      await createDirIfNotExist(PACKAGE_PATH);

      /**
       * 3. download package
       */
      const data = await (await got.get(packageInfo.url)).rawBody;

      /**
       * 4. unzip and save package to package directory
       */
      const zip = await unzip(data, 'PKG-INFO');
      for (const [path, buffer] of Object.entries(zip)) {
        const pyPath = path.replaceAll(`${name}-${packageInfo.version}/`, '');

        const subPath = path.match('/.+/');
        if (subPath) {
          const libPath = join(PACKAGE_PATH, subPath[0]);
          await createDirIfNotExist(libPath);
        }

        const file = join(PACKAGE_PATH, pyPath);
        await writeFile(file, buffer);
      }
    }
  });
}
