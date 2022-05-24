import * as Execa from 'execa';
import { install } from '../utils/install';

install((file: string, args?: string[], opts?: Execa.Options<string>) => {
  opts = {
    stdio: 'inherit',
    ...opts,
  };
  return Execa(file, args, opts);
})
  .then(() => {
    console.log('安装成功');
  })
  .catch((e) => {
    console.error(e);
  });
