import { LisaType, job } from '../utils/lisa_ex';
import { join, resolve } from 'path';
import {
  pathExists,
  mkdirs,
  remove,
  readJson,
  writeJson,
  statSync,
} from 'fs-extra';

import { getZepEnv, getFlasher } from '../env';

import parseArgs from '../utils/parseArgs';
import extendExec from '../utils/extendExec';
import { workspace } from '../utils/ux';
import { loadDT } from '../utils/dt';
import {
  parsePartitions,
  checkFsFilter,
  IFsFilter,
  IPartition,
} from '../utils/fs';
import { appendFlashConfig, getFlashArgs } from '../utils/flash';
import { getCMakeCache } from '../utils/cmake';

export default ({ application, cmd }: LisaType) => {
  job('fs:calc', {
    title: '计算所需文件系统大小',
    async task(ctx, task) {
      if (
        !pathExists('CMakeLists.txt') ||
        !pathExists('boards') ||
        !pathExists('py')
      ) {
        throw new Error('请在项目根目录下执行');
      }

      const stat = statSync('py');

      let size = stat.size;
      if (stat.size % 4096 != 0) {
        size += 4096 - (stat.size % 4096);
      }

      task.title = `所需大小至少为 ${size} bytes，在设备树文件（.overlay）中可对应替换为 0x${size.toString(
        16
      )}`;
    },
  });
};
