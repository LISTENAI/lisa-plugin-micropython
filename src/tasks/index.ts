import { LisaType } from '../utils/lisa_ex';

import create from './create';
import environment from './environment';
import fs from './fs';
import installation from './installation';
import mpremote from './mpremote';
import mpy_cross from './mpy_cross';
import project from './project';

export default (core: LisaType) => {
  create(core);
  environment(core);
  fs(core);
  installation(core);
  mpremote(core);
  mpy_cross(core);
  project(core);
};
