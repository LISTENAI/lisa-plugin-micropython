import { mkdirs, pathExists, readdirSync, Stats, statSync } from 'fs-extra';
import { basename, dirname, join, resolve } from 'path';
import { getBuildEnv } from '../env';
import { getCMakeCache } from '../utils/cmake';
import { findFlashInDts, FlashDesc } from '../utils/dt';
import extendExec from '../utils/extendExec';
import { job, LisaType } from '../utils/lisa_ex';
import parseArgs from '../utils/parseArgs';
import { flashFlags } from '../utils/westConfig';
import { venvZepScripts } from '../venv';

/**
 * 在 MicroPython SDK 中默认以 #elif defined(CONFIG_FLASH_MAP) && FLASH_AREA_LABEL_EXISTS(storage) 做判断
 */
const DEFAULT_FS_LABEL = 'storage';

const LFS_BLOCK_PER_FILE = 0;
const LFS_BLOCK_PER_DIRECTORY = 0;
const LFS_BLOCK_PER_SUPER_BLOCK = 0;

function walkSync(
  currentDirPath: string,
  callback: (path: string, stat: Stats) => void
) {
  readdirSync(currentDirPath).forEach((name) => {
    var filePath = join(currentDirPath, name);
    var stat = statSync(filePath);
    callback(filePath, stat);
    if (stat.isDirectory()) {
      walkSync(filePath, callback);
    }
  });
}

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

      const blockSize = 4096;

      const stat = statSync('py');
      let minSize = stat.size;
      if (minSize % blockSize != 0) {
        minSize += blockSize - (minSize % blockSize);
      }

      let blocksPerFile = 0;
      const codeDir = 'py';
      let blocksPerDirectory: { [key: string]: number } = { py: 0 };
      let size = 0;

      // https://github.com/littlefs-project/littlefs/issues/95
      const max = (a: number, b: number) => (a > b ? a : b);
      walkSync(codeDir, (path, stat) => {
        if (stat.isFile()) {
          blocksPerFile += max(1, stat.size / (blockSize - 8));
        }
        const dirName = dirname(path);
        if (!blocksPerDirectory[dirName]) {
          blocksPerDirectory[dirName] = 0;
        }
        const name = basename(path);
        blocksPerDirectory[dirName] +=
          (new TextEncoder().encode(name).length + 12) / (blockSize - 20);
      });
      blocksPerFile = Math.ceil(blocksPerFile);

      let directorySize = 0;
      Object.keys(blocksPerDirectory).forEach((key) => {
        directorySize += max(1, blocksPerDirectory[key]);
      });
      size = (blocksPerFile + 2 * directorySize) * blockSize;
      application.debug({ blocksPerDirectory, blocksPerFile, size });

      if (size < minSize) {
        size = minSize;
      }

      task.title = `所需大小至少为 ${size} bytes，在设备树文件（.overlay）中可对应替换为 0x${size.toString(
        16
      )}`;
    },
  });
  job('fs:check', {
    title: '资源镜像固定资源检查',
    async task(ctx, task) {
      const { args } = parseArgs(application.argv, {
        'build-dir': { short: 'd', arg: 'path', help: '构建产物目录' },
        'flash-area': { arg: 'label', help: '指定打包的分区节点' },
      });

      const buildDir = resolve(args['build-dir'] ?? 'build');

      const project =
        (await getCMakeCache(buildDir, 'APPLICATION_SOURCE_DIR', 'PATH')) || '';
      if (!(await pathExists(project))) {
        throw new Error(`项目不存在: ${project}`);
      }

      const zepEnv = await getBuildEnv(application);

      const label = args['flash-area'] || DEFAULT_FS_LABEL;

      const partition = await findFlashInDts(buildDir, label, zepEnv);

      if (!partition) {
        throw new Error(`找不到label 为 ${label} 的文件系统分区`);
      }

      ctx.partition = partition;
    },
  });

  job('fs:build', {
    title: '资源镜像构建',
    before: (ctx) => [application.tasks['fs:check']],
    async task(ctx, task) {
      const { args, printHelp } = parseArgs(application.argv, {
        'build-dir': { short: 'd', arg: 'path', help: '构建产物目录' },
        'task-help': { short: 'h', help: '打印帮助' },
        type: { arg: 'type', help: '指定打包的文件系统类型' },
      });
      if (args['task-help']) {
        return printHelp(['fs:build [options] [project-path]']);
      }

      const buildDir = resolve(args['build-dir'] ?? 'build');

      const project =
        (await getCMakeCache(buildDir, 'APPLICATION_SOURCE_DIR', 'PATH')) || '';
      if (!(await pathExists(project))) {
        throw new Error(`项目不存在: ${project}`);
      }

      let resourceDir = join(project, 'py');
      if (ctx.buildPath) { //specify fs resource directory, not to use default
        resourceDir = ctx.buildPath;
      }
      const resourceBuildDir = join(buildDir, 'resource');
      await mkdirs(resourceBuildDir);

      const zepEnv = await getBuildEnv(application);

      const exec = extendExec(cmd, { task, env: zepEnv });

      const part = ctx.partition as FlashDesc;
      if (!part) {
        throw new Error(`无法找到待构建的文件系统分区`);
      }
      let partSourceDir = resourceDir;

      await mkdirs(partSourceDir);
      const partFile = join(resourceBuildDir, `${part.label}.bin`);
      await exec('mklfs', ['.', partFile, `${part.reg[1]}`], {
        cwd: partSourceDir,
      });

      ctx.binFile = partFile;
      ctx.build = true; //before flash, should build fs resource
    },
  });

  job('fs:flash', {
    title: '资源镜像烧录',
    before: (ctx) => ctx.build ? [application.tasks['fs:build']] : [],
    async task(ctx, task) {
      const { args, printHelp } = parseArgs(application.argv, {
        env: { arg: 'name', help: '指定当次编译有效的环境' },
        'task-help': { short: 'h', help: '打印帮助' },
        runner: { arg: 'string', help: '指定当次的烧录类型' },
        'flash-area': { arg: 'label', help: '指定打包的分区节点' },
      });
      if (args['task-help']) {
        return printHelp();
      }

      const zepEnv = await getBuildEnv(application, args['env']);

      const exec = extendExec(cmd, { task, env: zepEnv });

      const partition = ctx.partition as FlashDesc;

      application.debug(partition);

      const VENUS_FLASH_BASE = 0x18000000;
      await exec(
        await venvZepScripts(application, 'west'),
        await flashFlags([
          'flash',
          `--flash-opt=--base-address=0x${(
            VENUS_FLASH_BASE + partition.reg[0]
          ).toString(16)}`,
          '--bin-file',
          ctx.binFile,
        ])
      );
    },
  });
};
