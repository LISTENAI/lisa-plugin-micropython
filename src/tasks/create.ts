import { readdirSync, writeFileSync } from 'fs';
import { copy, mkdirs } from 'fs-extra';
import { join } from 'path';
import { getFromZep } from '../env/config';
import { job, LisaType } from '../utils/lisa_ex';
import { replaceWord } from '../utils/template';
import { getFlashInDts, generateDtOverlay } from '../utils/dt';
import { getBuildEnv } from '../env';

export default (lisa: LisaType) => {
  job('create', {
    title: '创建项目',
    async task(ctx, task) {
      const targetDir = await task.prompt({
        type: 'Input',
        message: '创建文件夹名',
      });

      task.title = '创建项目 - 查找可用板型';

      const zephyrSdk = await getFromZep('sdk');
      if (!zephyrSdk) {
        throw new Error('无法获取 Zephyr SDK 目录');
      }

      const list = readdirSync(join(zephyrSdk, 'boards', 'arm')).filter((board) => {
        return board.startsWith('csk');
      });

      if (!list) {
        throw new Error('无法获取 SDK 中支持的 CSK 板型');
      }

      const targetBoard = await task.prompt({
        type: 'select',
        message: '选择板型',
        choices: list,
      });

      const dtsPath = join(
        zephyrSdk,
        'boards',
        'arm',
        targetBoard,
        `${targetBoard}.dts`
      );
      const env = await getBuildEnv(lisa.application);
      if (!env) {
        throw new Error('未初始化编译环境');
      }
      const result = await getFlashInDts(dtsPath, env);

      lisa.application.debug(result);
      if (!result) {
        throw new Error(`无法获取 ${targetBoard} 的 Flash 分区信息`);
      }

      const partition = result.partitions
        .sort((a, b) => a.reg[0] - b.reg[0])
        .filter((item) => item.label != 'storage');

      let max = result.size;
      let fsStart = result.start;
      if (partition.length > 0) {
        const last = partition[partition.length - 1];
        fsStart = last.reg[0] + last.reg[1];
        max = result.size - last.reg[0] - last.reg[1];
      }

      task.title =
        '创建项目\n单位 KB ，最大可用空间为 ' + max / 1024 + ' KB，默认 512';

      const fileSystemSize = await task.prompt({
        type: 'Numeral',
        message: '文件系统大小',
        float: false,
      });

      mkdirs(targetDir);

      task.title = '创建项目';

      await copy(join(__dirname, '../../template'), targetDir);

      mkdirs(join(targetDir, 'boards'));

      writeFileSync(
        join(targetDir, 'boards', `${targetBoard}.overlay`),
        generateDtOverlay({
          fsSize: fileSystemSize * 1024,
          fsStart,
          deleteNodes: result.partitions
            .filter((item) => item.label == 'storage')
            .map((item) => item.name),
        })
      );

      // 空文件
      writeFileSync(join(targetDir, 'boards', `${targetBoard}.conf`), '');

      // 项目名
      replaceWord(
        join(targetDir, 'CMakeLists.txt'),
        '{{PROJECT_NAME}}',
        targetDir
      );
    },
  });
};
