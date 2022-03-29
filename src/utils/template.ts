import { readFileSync, writeFileSync } from 'fs';

export async function replaceWord(
  filePath: string,
  oldWord: string,
  newWord: string
) {
  const content = readFileSync(filePath).toString('utf-8');
  const newContent = content.replace(oldWord, newWord);
  writeFileSync(filePath, newContent);
}
