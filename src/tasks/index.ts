import { LisaType } from '../utils/lisa_ex';

import create from './create';
import environment from './environment';
import fs from './fs';
import installation from './installation';
import mpy_cross from './mpy_cross';
import project from './project';

export default (core: LisaType) => {
  create(core);
  environment(core);
  fs(core);
  installation(core);
  mpy_cross(core);
  project(core);
};
