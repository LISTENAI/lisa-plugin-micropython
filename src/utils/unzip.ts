import * as zlib from 'zlib';
import { PassThrough, Readable } from 'stream';
import { once } from 'events';
import { Headers } from 'tar-stream';
import * as tar from 'tar-stream';

/**
 * extract tar.gz tar gz file
 * @param buffer 
 * @param filter 
 * @returns 
 */
export default async function (buffer: Buffer, filter?: string): Promise<{ [key: string]: Buffer }> {
    const extract = tar.extract();
    const entries: { [path: string]: Buffer } = {};

    extract.on('entry', (header: Headers, stream: PassThrough, next: () => void) => {
        stream.on('data', (chunk: Buffer) => {
            const addToEntries = () => {
                //found same file in entries, concat buffer
                if (entries[header.name]) {
                    entries[header.name] = Buffer.concat([entries[header.name], chunk]);
                } else {
                    entries[header.name] = chunk;
                }
            };

            if (!filter) {
                addToEntries();
            } else if (!header.name.includes(filter)) {
                addToEntries();
            }
        });

        stream.on('end', () => {
            next();
        });

        stream.resume();
    });

    Readable.from(buffer)
        .pipe(zlib.createGunzip())
        .pipe(extract);

    await once(extract, 'finish');

    return entries;
}
