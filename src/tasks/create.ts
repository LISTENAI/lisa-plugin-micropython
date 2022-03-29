import { LisaType, job } from '../utils/lisa_ex';
import { get } from '../env/config';
import { join, parse, resolve, sep } from 'path';
import { pathExists, createReadStream, copy, mkdirs } from 'fs-extra';
import { createInterface } from 'readline';
import { once } from 'events';
import { ISampleList, path2json } from '../utils/fs';
import { replaceWord } from '../utils/template';

export default ({ application, cmd }: LisaType) => {
  job('create', {
    title: '创建项目',
    async task(ctx, task) {
      const fileSystemSize = await task.prompt({
        type: 'Input',
        message: '文件系统大小 (KB)',
        initial: '512',
      });
      const targetDir = await task.prompt({
        type: 'Input',
        message: '创建文件夹名',
      });

      mkdirs(targetDir);

      await copy(join(__dirname, '../../template'), targetDir);

      // 项目名
      replaceWord(
        join(targetDir, 'CMakeLists.txt'),
        '{{PROJECT_NAME}}',
        targetDir
      );
      const fsSizeKb = parseInt(fileSystemSize, 10);
      replaceWord(
        join(targetDir, 'boards', 'csk6001_pico.overlay'),
        '{{FILESYSTEM_SIZE}}',
        `0x${(fsSizeKb * 1024).toString(16)}`
      );
    },
  });
};
