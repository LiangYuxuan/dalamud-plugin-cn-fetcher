/* eslint-disable import-x/no-unused-modules */

import fs from 'node:fs/promises';

import {
    storeManifestFiles,
} from './delay.ts';
import {
    fetchManifest, processManifest, getRepoString,
} from './repos.ts';
import {
    updateManifestToProxy,
} from './url.ts';

import type { Repo } from './repos.ts';

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
        owner: 'lichie567',
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
];
/* eslint-enable @typescript-eslint/naming-convention */

const original = await Promise.all(
    repos.map(async (repo) => ({
        repo,
        manifests: await (
            fetchManifest(repo)
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
    .map(async ({ repo, manifests }) => {
        if (repo.type === 'delay') {
            return storeManifestFiles(repo.key, manifests);
        }
        return manifests;
    }));

const final = processed.flat();
const proxied = updateManifestToProxy(final);

await Promise.all([
    fs.writeFile('pluginmaster.json', JSON.stringify(proxied, undefined, 4)),
    fs.writeFile('pluginmaster_gh.json', JSON.stringify(final, undefined, 4)),
]);
