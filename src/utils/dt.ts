import LISA from '@listenai/lisa_core';
import { resolve } from 'path';

export interface IDeviceTreeParser {
  choose(name: string): Node | null;
  label(label: string): Node | null;
  node(path: NodePath): Node | null;
  labelNameByPath(path: NodePath): string | null;
  under(parent: NodePath): Node[];
}

export type NodePath = string;

export interface DeviceTree {
  readonly chosens: Record<string, NodePath>;
  readonly labels: Record<string, NodePath>;
  readonly nodes: Record<NodePath, Node>;
}

export interface FlashDesc {
  start: number;
  size: number;
  partitions: FlashPartision[];
}

export type Property =
  | boolean
  | string
  | number
  | string[]
  | number[]
  | NodePath
  | Controller[];

export interface Node {
  path: string;
  compatible?: string[];
  label?: string;
  reg?: Register[];
  status?: 'okay' | 'disabled';
  interrupts?: number[];
  properties: Record<string, Property>;
}

export interface Register {
  addr?: number;
  size?: number;
}

export interface Controller {
  controller: NodePath;
  name?: string;
  data: Record<string, any>;
}

export interface FlashPartision {
  reg: [number, number];
  label: string;
  name: string;
}

export async function findFlashInDts(
  buildDir: string,
  label: string,
  env: Record<string, string>
): Promise<FlashPartision | null> {
  const { stdout } = await LISA.cmd(
    'python',
    [
      resolve(__dirname, '..', '..', 'scripts', 'find_flash_in_dts.py'),
      '--dts',
      resolve(buildDir, 'zephyr', 'zephyr.dts'),
      '--label',
      label,
    ],
    { env }
  );
  if (stdout == 'None') {
    return null;
  }
  return JSON.parse(stdout) as FlashPartision;
}

export function generateDtOverlay(params: {
  fsStart: number;
  fsSize: number;
  deleteNodes?: string[];
}): string {
  return `
#include <dt-bindings/gpio/gpio.h>

${
  params.deleteNodes && params.deleteNodes.length > 0
    ? params.deleteNodes.map((node) => `/delete-node/ &${node};`).join('\n')
    : ''
}

/ {
	chosen {
		/*
		 * shared memory reserved for the inter-processor communication
		 */
		zephyr,flash_sysfs_storage = &filesystem_part;
		zephyr,flash_controller = &flash;
	};
	
	fstab {
		compatible = "zephyr,fstab";
		lfs1: lfs1 {
			compatible = "zephyr,fstab,littlefs";
			mount-point = "/flash";
			partition = <&filesystem_part>;
			automount ;
			read-size = <16>;
			prog-size = <16>;
			cache-size = <64>;
			lookahead-size = <32>;
			block-cycles = <512>;
		};
	};
};
 
&flash0 {
	partitions {
		compatible = "fixed-partitions";
		#address-cells = <1>;
		#size-cells = <1>;
		filesystem_part: partition@${params.fsStart.toString(16)} {
			label = "storage";
			reg = <0x${params.fsStart.toString(16)} 0x${params.fsSize.toString(16)}>;
		};
	};
};
  `;
}

export async function getFlashInDts(
  dtsPath: string,
  env: Record<string, string>
): Promise<FlashDesc | null> {
  const { stdout } = await LISA.cmd(
    'python',
    [
      resolve(__dirname, '..', '..', 'scripts', 'find_flash_partitions.py'),
      '--dts',
      dtsPath,
    ],
    { env }
  );
  if (stdout == 'None') {
    return null;
  }
  return JSON.parse(stdout) as FlashDesc;
}

export async function loadDT(
  buildDir: string,
  env: Record<string, string>
): Promise<DeviceTree & IDeviceTreeParser> {
  const { stdout } = await LISA.cmd(
    'python',
    [
      resolve(__dirname, '..', '..', 'scripts', 'edt2json.py'),
      '--dtlib',
      resolve(env.ZEPHYR_BASE, 'scripts', 'dts', 'python-devicetree', 'src'),
      '--edt-pickle',
      resolve(buildDir, 'zephyr', 'edt.pickle'),
    ],
    { env }
  );
  const dt = JSON.parse(stdout) as DeviceTree;
  return new DeviceTreeParser(dt);
}

export default class DeviceTreeParser implements IDeviceTreeParser, DeviceTree {
  readonly chosens: Record<string, NodePath> = {};
  readonly labels: Record<string, NodePath> = {};
  readonly nodes: Record<NodePath, Node> = {};

  constructor(dt: DeviceTree) {
    Object.assign(this, dt);
  }

  choose(name: string): Node | null {
    const path = this.chosens[name];
    if (!path) return null;
    return this.nodes[path] || null;
  }

  label(label: string): Node | null {
    const path = this.labels[label];
    if (!path) return null;
    return this.nodes[path] || null;
  }

  node(path: NodePath): Node | null {
    return this.nodes[path] || null;
  }

  labelNameByPath(path: NodePath): string | null {
    return (
      Object.keys(this.labels).find(
        (labelName) => this.labels[labelName] === path
      ) || null
    );
  }

  under(parent: NodePath): Node[] {
    return Object.keys(this.nodes)
      .filter((path) => isChild(parent, path))
      .map((path) => this.nodes[path])
      .filter((node) => !!node);
  }
}

function isChild(parent: NodePath, path: NodePath): boolean {
  return (
    path.startsWith(`${parent}/`) &&
    !path.substr(parent.length + 1).includes('/')
  );
}
