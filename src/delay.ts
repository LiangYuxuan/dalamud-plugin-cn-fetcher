/* eslint-disable @typescript-eslint/naming-convention */

import fs from 'node:fs/promises';
import path from 'node:path';

import type { Manifest } from './types/manifest.ts';

const storePlugin = async (key: string, rootPath: string, plugin: Manifest): Promise<Manifest> => {
    const { InternalName } = plugin;

    let {
        DownloadLinkInstall,
        DownloadLinkUpdate,
        DownloadLinkTesting,
    } = plugin;

    if (typeof DownloadLinkInstall === 'string') {
        const buffer = Buffer.from(
            new Uint8Array(
                await (await fetch(DownloadLinkInstall)).arrayBuffer(),
            ),
        );
        const filePath = path.join(rootPath, `${InternalName}_Install.zip`);
        await fs.writeFile(filePath, buffer);

        DownloadLinkInstall = `https://raw.githubusercontent.com/LiangYuxuan/dalamud-plugin-cn-fetcher/master/store/${key}/${InternalName}_Install.zip`;
    }

    if (typeof DownloadLinkUpdate === 'string') {
        const buffer = Buffer.from(
            new Uint8Array(
                await (await fetch(DownloadLinkUpdate)).arrayBuffer(),
            ),
        );
        const filePath = path.join(rootPath, `${InternalName}_Update.zip`);
        await fs.writeFile(filePath, buffer);

        DownloadLinkUpdate = `https://raw.githubusercontent.com/LiangYuxuan/dalamud-plugin-cn-fetcher/master/store/${key}/${InternalName}_Update.zip`;
    }

    if (typeof DownloadLinkTesting === 'string') {
        const buffer = Buffer.from(
            new Uint8Array(
                await (await fetch(DownloadLinkTesting)).arrayBuffer(),
            ),
        );
        const filePath = path.join(rootPath, `${InternalName}_Testing.zip`);
        await fs.writeFile(filePath, buffer);

        DownloadLinkTesting = `https://raw.githubusercontent.com/LiangYuxuan/dalamud-plugin-cn-fetcher/master/store/${key}/${InternalName}_Testing.zip`;
    }

    return {
        ...plugin,
        DownloadLinkInstall,
        DownloadLinkUpdate,
        DownloadLinkTesting,
    };
};

export const storeManifestFiles = async (
    key: string,
    manifests: Manifest[],
): Promise<Manifest[]> => {
    const rootPath = path.join('store', key);
    await fs.mkdir(rootPath, { recursive: true });

    const result = await Promise.all(manifests.map((plugin) => storePlugin(key, rootPath, plugin)));

    const manifestPath = path.join(rootPath, 'pluginmaster.json');
    await fs.writeFile(manifestPath, JSON.stringify(result, undefined, 4));

    return manifests;
};

export const getManifestFromStored = async (
    key: string,
): Promise<Manifest[]> => {
    const rootPath = path.join('store', key);
    const manifestPath = path.join(rootPath, 'pluginmaster.json');

    const data = await fs.readFile(manifestPath, 'utf-8');
    const manifests = JSON.parse(data) as Manifest[];

    return manifests;
};
