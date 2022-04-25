import { spawnSync } from 'child_process';
import { createHash } from 'crypto';
import {
  createWriteStream,
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from 'fs';
import * as http from 'http';
import * as https from 'https';
import { random } from 'lodash';
import { Socket } from 'net';
import { tmpdir } from 'os';
import { join, resolve } from 'path';
import { PLUGIN_HOME } from '../env/config';
import { KEY_OF_PATH } from './path';

const _msysDest = join(PLUGIN_HOME, 'msys2');
const _msysRootDir = join(_msysDest, 'msys64');

const inst_version = '2022-03-19';
const inst_url = `https://iflyos-external.oss-cn-shanghai.aliyuncs.com/public/lisa-binary/msys2-installer/${inst_version}/msys2-base-x86_64-${inst_version.replace(
  /-/g,
  ''
)}.sfx.exe`;
const checksum =
  '0548cc4c1f667ba8ab22760e039d2c8a088b419b432c9597eb8adf8235c13fab';
const msystem_allowed = [
  'MSYS',
  'MINGW32',
  'MINGW64',
  'UCRT64',
  'CLANG32',
  'CLANG64',
];

const _socketTimeout = 3 * 60 * 1000; // 3 minutes

function getFileHash(file: string) {
  const fileBuffer = readFileSync(file);
  const hashSum = createHash('sha256');
  hashSum.update(fileBuffer);

  return hashSum.digest('hex');
}

function debug(msg: any) {
  console.log(msg);
}

function makeRequestWithCallback(
  options: http.RequestOptions,
  httpModule: typeof http | typeof https,
  callback: (msg: http.IncomingMessage) => void
): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    const request = httpModule.request(options, callback);
    let socket: Socket;
    request.on('socket', (sock) => {
      socket = sock;
    });
    request.setTimeout(_socketTimeout, () => {
      if (socket) {
        socket.end();
      }
      reject(new Error('Request timed out: ' + options.path));
    });
    request.on('error', (err) => {
      reject(err);
    });
    request.on('close', () => {
      resolve();
    });
    request.end();
  });
}

function downloadTool(url: string, dest?: string): Promise<string> {
  return new Promise(async (resolve, reject) => {
    const finalDest = dest || join(tmpdir(), random(true) * 100000 + '.exe');

    const parsedUrl = new URL(url);
    const usingSsl: boolean = parsedUrl.protocol === 'https:';
    const httpModule = usingSsl ? https : http;
    const defaultPort: number = usingSsl ? 443 : 80;
    const options = <http.RequestOptions>{};

    options.host = parsedUrl.hostname;
    options.port = parsedUrl.port ? parseInt(parsedUrl.port) : defaultPort;
    options.path = parsedUrl.pathname + parsedUrl.search;
    options.method = 'GET';

    await makeRequestWithCallback(options, httpModule, (msg) => {
      // stream to dest
      const stream = createWriteStream(finalDest);

      msg.pipe(stream);

      stream.on('finish', () => {
        stream.close();
        resolve(finalDest);
      });
    });
  });
}

async function downloadInstaller(): Promise<string> {
  const destination = await downloadTool(inst_url);

  let computedChecksum = '';
  const checkSum = getFileHash(destination);
  computedChecksum = checkSum;

  if (computedChecksum.toUpperCase() !== checksum.toUpperCase()) {
    throw new Error(
      `The SHA256 of the installer does not match! expected ${checksum} got ${computedChecksum}`
    );
  }
  return destination;
}

async function disableKeyRefresh(msysRootDir: string) {
  const postFile = join(msysRootDir, 'etc\\post-install\\07-pacman-key.post');
  spawnSync(`powershell.exe`, [
    `((Get-Content -path ${postFile} -Raw) -replace '--refresh-keys', '--version') | Set-Content -Path ${postFile}`,
  ]);
}

let cmd: string | null = null;

async function writeWrapper(
  msysRootDir: string,
  pathtype: string,
  destDir: string,
  name: string
) {
  let wrap = [
    `@echo off`,
    `setlocal`,
    `IF NOT DEFINED MSYS2_PATH_TYPE set MSYS2_PATH_TYPE=` + pathtype,
    `set CHERE_INVOKING=1`,
    msysRootDir + `\\usr\\bin\\bash.exe -leo pipefail %*`,
  ].join('\r\n');

  cmd = join(destDir, name);
  writeFileSync(cmd, wrap);
}

async function runMsys(args: string[], opts?: any) {
  const quotedArgs = args.map((arg) => {
    return `'${arg.replace(/'/g, `'\\''`)}'`;
  }); // fix confused vim syntax highlighting with: `
  spawnSync(
    'cmd',
    ['/D', '/S', '/C', cmd || ''].concat(['-c', quotedArgs.join(' ')]),
    opts
  );
}

async function pacman(args: string[], opts?: any, cmd?: string) {
  await runMsys([cmd ? cmd : 'pacman', '--noconfirm'].concat(args), opts);
}

export function getMinGWEnv(): Record<string, string | string[]> {
  const result: Record<string, string | string[]> = {};
  result[KEY_OF_PATH] = [_msysDest, join(_msysRootDir, 'usr', 'bin')];
  result['MSYSTEM'] = 'MINGW64';
  return result;
}

export async function installMinGW(): Promise<
  Record<string, string | string[]>
> {
  if (!existsSync(_msysDest)) {
    mkdirSync(_msysDest);
  }

  const inst_dest = await downloadInstaller();

  // Extracting MSYS2...
  debug('Extracting MSYS2...:  ');
  const extractResult = spawnSync(resolve(inst_dest), [
    '-y',
    `-o${resolve(_msysDest)}`,
  ]);
  if (extractResult.status != 0) {
    throw new Error(
      `Failed to extract MSYS2 installer: ${
        extractResult.stderr || extractResult.stdout
      }`
    );
  }

  await disableKeyRefresh(_msysRootDir);

  writeWrapper(_msysRootDir, 'inherit', _msysDest, 'msys2.cmd');

  debug('Starting MSYS2 for the first time...');
  await runMsys(['uname', '-a']);

  debug('Disable CheckSpace...');
  await runMsys([
    'sed',
    '-i',
    's/^CheckSpace/#CheckSpace/g',
    '/etc/pacman.conf',
  ]);

  debug('Updating packages...');
  await pacman(['-Syuu', '--overwrite', '*'], { ignoreReturnCode: true });

  // pacman.conf will be installed as pacman.conf.pacnew
  debug('Installing pacman.conf...');
  await runMsys(['mv', '-f', '/etc/pacman.conf.pacnew', '/etc/pacman.conf'], {
    ignoreReturnCode: true,
    silent: true,
  });

  // Killing remaining tasks...
  debug('Killing remaining tasks...');
  spawnSync('taskkill', ['/F', '/FI', 'MODULES eq msys-2.0.dll']);

  // Final system upgrade...
  debug('Final system upgrade...');
  await pacman(['-Syuu', '--overwrite', '*'], {});

  return getMinGWEnv();
}
