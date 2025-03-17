/* eslint-disable import-x/no-unused-modules */

import assert from 'node:assert';
import fs from 'node:fs/promises';

import {
    storeManifestFiles, getManifestFromStored,
} from './delay.ts';
import {
    fetchManifest, processManifest, getRepoString,
} from './repos.ts';
import {
    updateManifestToDateBefore, updateManifestToProxy,
} from './url.ts';

import type { Repo } from './repos.ts';

interface VersionInfo {
    version: string,
    global: Date,
    cn?: Date,
}

// https://na.finalfantasyxiv.com/lodestone/special/patchnote_log/
// https://ff.web.sdo.com/web8/index.html#/newstab/newslist
const versions: VersionInfo[] = [
    {
        version: '7.2',
        global: new Date('2025-03-25T08:00:00Z'),
    },
    {
        version: '7.1',
        global: new Date('2024-11-12T08:00:00Z'),
        cn: new Date('2025-02-18T08:00:00Z'),
    },
    {
        version: '7.0',
        global: new Date('2024-06-28T08:00:00Z'),
        cn: new Date('2024-09-27T08:00:00Z'),
    },
    {
        version: '6.5',
        global: new Date('2023-10-03T08:00:00Z'),
        cn: new Date('2024-03-05T08:00:00Z'),
    },
    {
        version: '6.4',
        global: new Date('2023-05-23T08:00:00Z'),
        cn: new Date('2023-09-19T08:00:00Z'),
    },
    {
        version: '6.3',
        global: new Date('2023-01-10T08:00:00Z'),
        cn: new Date('2023-05-09T08:00:00Z'),
    },
];

/* eslint-disable @typescript-eslint/naming-convention */
const repos: Repo[] = [
    {
        type: 'github-global',
        owner: 'daemitus',
        repo: 'MyDalamudPlugins',
        branch: 'master',
        path: 'pluginmaster.json',
        include: [
            {
                Name: 'XIV Combo Expanded',
            },
        ],
    },
    {
        type: 'github-global',
        owner: 'Tischel',
        repo: 'LMeter',
        branch: 'main',
        path: 'repo.json',
        include: [
            {
                Name: 'LMeter',
            },
        ],
    },
    {
        type: 'github-global',
        owner: 'Bluefissure',
        repo: 'DalamudPlugins',
        branch: 'Bluefissure',
        path: 'pluginmaster.json',
        include: [
            {
                Name: 'Double Weaver',
            },
            {
                Name: 'HousingPos',
            },
        ],
    },
    {
        type: 'github-global',
        owner: 'reckhou',
        repo: 'DalamudPlugins-Ori',
        branch: 'api6',
        path: 'pluginmaster.json',
        include: [
            {
                Name: 'MidiBard 2',
            },
        ],
    },
    {
        type: 'github-global',
        owner: 'chalkos',
        repo: 'Marketbuddy',
        branch: 'main',
        path: 'repo.json',
        include: [
            {
                Name: 'Marketbuddy',
            },
        ],
    },
    {
        type: 'github-global',
        owner: 'Aida-Enna',
        repo: 'XIVPlugins',
        branch: 'main',
        path: 'repo.json',
        include: [
            {
                Name: 'Auto Login',
            },
            {
                Name: 'Food Check',
            },
        ],
    },
    {
        type: 'github-global',
        owner: 'Penumbra-Sync',
        repo: 'repo',
        branch: 'main',
        path: 'plogonmaster.json',
        include: [
            {
                Name: 'Mare Synchronos',
            },
        ],
    },
    {
        type: 'github-global',
        owner: 'a08381',
        repo: 'Dalamud.SkipCutscene',
        branch: 'dist',
        path: 'repo.json',
        include: [
            {
                Name: 'SkipCutscene',
            },
        ],
    },
    {
        type: 'delay',
        url: 'https://plugins.carvel.li/',
        key: 'carvel',
    },
    {
        type: 'delay',
        url: 'https://love.puni.sh/ment.json',
        key: 'punish',
    },
    {
        type: 'delay',
        url: 'https://puni.sh/api/repository/veyn',
        key: 'veyn',
        exclude: [
            {
                Name: 'Boss Mod',
            },
        ],
    },
    {
        type: 'delay',
        url: 'https://aetherment.sevii.dev/plugin',
        key: 'sevii',
    },
    {
        type: 'github-cn',
        owner: 'akira0245',
        repo: 'DalamudPlugins',
        branch: 'master',
        path: 'pluginmaster.json',
        include: [
            {
                Name: 'EasyZoom',
            },
        ],
    },
    {
        type: 'github-cn',
        owner: 'Nukoooo',
        repo: 'DalamudPlugins',
        branch: 'dev',
        path: 'pluginmaster.json',
        include: [
            {
                Name: 'FF Logs Viewer (CN)',
            },
        ],
    },
    {
        type: 'github-cn',
        owner: '44451516',
        repo: 'XIVSlothCombo',
        branch: 'CN',
        path: 'release/pluginmaster.json',
        include: [
            {
                Name: 'XIVSlothComboX',
            },
        ],
    },
    {
        type: 'github-cn',
        owner: '44451516',
        repo: 'ffxiv_bossmod',
        branch: 'CN',
        path: 'pluginmaster.json',
        include: [
            {
                Name: 'Boss Mod',
            },
        ],
    },
    {
        type: 'github-cn',
        owner: 'emptyset0',
        repo: 'Radar_akira0245',
        branch: 'master',
        path: 'pluginmaster.json',
        include: [
            {
                Name: 'Radar',
            },
        ],
    },
    {
        type: 'github-cn',
        owner: 'AtmoOmen',
        repo: 'DalamudPlugins',
        branch: 'main',
        path: 'pluginmaster.json',
        include: [
            {
                Name: 'Daily Routines',
            },
        ],
    },
];
/* eslint-enable @typescript-eslint/naming-convention */

const today = new Date();
const versionCNIndex = versions
    .findIndex((version) => version.cn !== undefined && today >= version.cn);

assert(versionCNIndex !== -1, 'Unknown CN version');

const versionGlobalDate = versionCNIndex > 0
    && today >= versions[versionCNIndex - 1].global
    ? versions[versionCNIndex - 1].global.toISOString()
    : today.toISOString();

const original = await Promise.all(
    repos.map(async (repo) => ({
        repo,
        manifests: await (
            fetchManifest(repo, versionGlobalDate)
                .catch((error: unknown) => {
                    console.error(`Failed to fetch ${getRepoString(repo)}`);
                    throw error;
                })
        ),
    })),
);

const processed = await Promise.all(original
    .map(({ repo, manifests }) => ({
        repo,
        manifests: processManifest(repo, manifests),
    }))
    .map(({ repo, manifests }) => {
        if (repo.type === 'github-global') {
            return Promise
                .all(updateManifestToDateBefore(manifests, versionGlobalDate))
                .catch((error: unknown) => {
                    console.error(`Failed to get old versions for ${getRepoString(repo)}`);
                    throw error;
                });
        }
        if (repo.type === 'delay') {
            if (versionCNIndex === 0) {
                // global === cn, update stored files
                return storeManifestFiles(repo.key, manifests);
            }

            // global > cn, use stored files
            return getManifestFromStored(repo.key);
        }
        return manifests;
    }));

const final = processed.flat();
const proxied = updateManifestToProxy(final);

await Promise.all([
    fs.writeFile('pluginmaster.json', JSON.stringify(proxied, undefined, 4)),
    fs.writeFile('pluginmaster_gh.json', JSON.stringify(final, undefined, 4)),
]);
