import { pathExists } from 'fs-extra';
import { join } from 'path';
import { DeviceTree, IDeviceTreeParser } from './dt';

export interface IPartition {
  label: string;
  addr: number;
  size: number;
  type: 'littlefs';
  source?: string;
}

export function parseFlashPartitions(
  dt: DeviceTree & IDeviceTreeParser
): IPartition[] {
  const partitions: IPartition[] = [];
  for (const node of Object.values(dt.nodes)) {
    console.log(node);
    if (node.compatible?.includes('fixed-partitions')) {
      console.log('fixed-partitions');
      for (const partitionsNode of Object.values(node)) {
        if (partitionsNode.reg) {
          partitions.push({
            label: partitionsNode.label,
            addr: partitionsNode.reg.address,
            size: partitionsNode.reg.size,
            type: 'littlefs',
          });
        }
      }
    }
  }
  return partitions;
}

export function parsePartitions(
  dt: DeviceTree & IDeviceTreeParser
): IPartition[] {
  const partitions: IPartition[] = [];
  for (const node of Object.values(dt.nodes)) {
    if (node.compatible?.includes('zephyr,fstab,littlefs')) {
      const path = node.properties.partition;
      if (typeof path != 'string') continue;

      const labelName = dt.labelNameByPath(node.path);
      if (typeof labelName != 'string') continue;

      const part = dt.node(path);
      // if (!part?.label) continue;
      if (!part?.reg || !part?.reg[0]) continue;

      const reg = part.reg[0];
      if (typeof reg.addr != 'number' || typeof reg.size != 'number') continue;
      partitions.push({
        label: labelName,
        addr: reg.addr,
        size: reg.size,
        type: 'littlefs',
      });
    }
  }
  return partitions;
}

export interface IFsFilter {
  [key: string]: string | IFsFilter;
}

export async function checkFsFilter(
  label: string,
  fsFilter: IFsFilter,
  prePath: string
): Promise<void> {
  const filter = fsFilter[label];
  if (!filter) return;

  if (typeof filter === 'string') {
    if (!(await pathExists(join(prePath, filter)))) {
      throw new Error(`????????????????????????${label}?????????${join(prePath, filter)}`);
    }
  } else {
    for (const part of Object.keys(filter)) {
      await checkFsFilter(part, filter, join(prePath, label));
    }
  }
}

export interface ISampleList {
  [key: string]: string | ISampleList;
}

export async function path2json(
  dirParse: Array<string>,
  json: ISampleList
): Promise<ISampleList> {
  if (!dirParse.length) return json;
  const dir = dirParse.shift();
  if (dir) {
    if (typeof json[dir] === 'string') {
      return json;
    }
    json[dir] = dirParse.length
      ? await path2json(dirParse, (json[dir] || {}) as ISampleList)
      : dir;
  } else {
    return await path2json(dirParse, json);
  }
  return json;
}
