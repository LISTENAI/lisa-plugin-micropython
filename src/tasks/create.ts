import { readdirSync } from 'fs';
import { copy, mkdirs } from 'fs-extra';
import { join } from 'path';
import { job, LisaType } from '../utils/lisa_ex';
import { replaceWord } from '../utils/template';

export default (lisa: LisaType) => {
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
      // list file in boards/*.overlay
      const boardsDir = join(targetDir, 'boards');
      readdirSync(boardsDir)
        .filter((file) => file.endsWith('.overlay'))
        .forEach((file) => {
          replaceWord(
            join(boardsDir, file),
            '{{FILESYSTEM_SIZE}}',
            `0x${(fsSizeKb * 1024).toString(16)}`
          );
        });
    },
  });
};
