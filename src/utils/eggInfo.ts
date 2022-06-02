import { existsSync } from "fs";
import { readFile } from "fs/promises";
import { join } from "path";

export interface EggInfo {
  [name: string]: {
    version: string;
    sources: string[];
  }
}

export const readEggInfo = async (path: string): Promise<{ eggFilePath: string, eggInfo: EggInfo }> => {
  const eggFilePath = join(process.cwd(), path);
  let eggInfo: EggInfo = {};
  if (existsSync(eggFilePath)) {
    const eggData = await readFile(eggFilePath);
    eggInfo = JSON.parse(eggData.toString());
  }
  return { eggFilePath, eggInfo };
};
