import { LisaType } from '../utils/lisa_ex';

import create from './create';
import environment from './environment';
import fs from './fs';
import installation from './installation';
import project from './project';

export default (core: LisaType) => {
  create(core);
  environment(core);
  fs(core);
  installation(core);
  project(core);
};
