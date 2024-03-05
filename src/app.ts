import assert from 'node:assert';
import fs from 'node:fs/promises';

import { fetchManifest, processManifest, Repo } from './repos.ts';
import {
    manifestToDateBefore, manifestToProxy,
} from './url.ts';

interface VersionInfo {
    version: string,
    global: Date,
    cn?: Date,
}

// https://ffxiv.fandom.com/wiki/Patch_notes
// https://ff.web.sdo.com/web8/index.html#/newstab/newslist
const versions: VersionInfo[] = [
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
        repo: 'XIVAuras',
        branch: 'main',
        path: 'repo.json',
        include: [
            {
                Name: 'XIVAuras',
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
            {
                Name: 'Loot Master',
            },
        ],
    },
    {
        type: 'direct',
        url: 'https://plugins.carvel.li/',
        include: [
            {
                Name: 'Slice is Right',
            },
            {
                Name: 'Palace Pal',
            },
        ],
    },
    {
        type: 'direct',
        url: 'https://love.puni.sh/ment.json',
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
        owner: 'moewcorp',
        repo: 'DalamudPlugins',
        branch: 'main',
        path: 'pluginmaster.json',
        include: [
            {
                Name: 'SkipCutscene',
            },
        ],
    },
];

const today = new Date();
const versionCNIndex = versions
    .findIndex((version) => version.cn && today >= version.cn);

assert(versionCNIndex !== -1, 'Unknown CN version');

const versionGlobalDate = versionCNIndex > 0
    && today >= versions[versionCNIndex - 1].global
    ? versions[versionCNIndex - 1].global.toISOString()
    : today.toISOString();

const original = await Promise.all(
    repos.map(async (repo) => ({
        repo,
        manifests: await fetchManifest(repo, versionGlobalDate),
    })),
);

const processed = await Promise.all(original
    .map(({ repo, manifests }) => ({
        repo,
        manifests: processManifest(repo, manifests),
    }))
    .map(({ repo, manifests }) => {
        if (versionGlobalDate && repo.type === 'github-global') {
            return Promise.all(manifestToDateBefore(manifests, versionGlobalDate));
        }
        return manifests;
    }));

const final = processed.flat();
const proxied = manifestToProxy(final);

await Promise.all([
    fs.writeFile('pluginmaster.json', JSON.stringify(proxied, undefined, 4)),
    fs.writeFile('pluginmaster_gh.json', JSON.stringify(final, undefined, 4)),
]);
