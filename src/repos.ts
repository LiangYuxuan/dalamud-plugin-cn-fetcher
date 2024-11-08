import { getCommitDateBefore } from './url.ts';

import type { Manifest } from './types/manifest.ts';

const manifestMatchKey = [
    'Name',
    'InternalName',
    'Author',
] as const satisfies readonly (keyof Manifest)[];

type ManifestMatch = {
    [K in typeof manifestMatchKey[number]]?: Manifest[K];
};

interface ModifiedRules {
    include?: ManifestMatch[],
    exclude?: ManifestMatch[],
    modifier?: [ManifestMatch, Partial<Manifest>][],
}

interface GitHubGlobalRepo extends ModifiedRules {
    type: 'github-global',
    owner: string,
    repo: string,
    branch: string,
    path: string,
}

interface GitHubCNRepo extends ModifiedRules {
    type: 'github-cn',
    owner: string,
    repo: string,
    branch: string,
    path: string,
}

interface DirectRepo extends ModifiedRules {
    type: 'direct',
    url: string,
}

interface DelayGlobalRepo extends ModifiedRules {
    type: 'delay',
    url: string,
    key: string,
}

const matchManifest = (
    manifest: Manifest,
    match: ManifestMatch,
): boolean => manifestMatchKey
    .every((key) => typeof match[key] === 'undefined' || manifest[key] === match[key]);

export type Repo = GitHubGlobalRepo | GitHubCNRepo | DirectRepo | DelayGlobalRepo;

export const getRepoString = (repo: Repo): string => {
    switch (repo.type) {
        case 'direct':
            return `direct:${repo.url}`;
        case 'delay':
            return `delay:${repo.url}`;
        case 'github-global':
        case 'github-cn':
            return `${repo.type}:${repo.owner}/${repo.repo}`;
        default:
            repo satisfies unknown;
            throw new Error('Unknown repo type');
    }
};

export const processManifest = (
    repo: Repo,
    manifests: Manifest[],
): Manifest[] => {
    const { include, exclude, modifier } = repo;

    let result = manifests;
    if (include) {
        const allIncludeExists = include
            .every((match) => result.some((manifest) => matchManifest(manifest, match)));

        if (!allIncludeExists) {
            throw new Error(`Some included plugins are not found in ${getRepoString(repo)}`);
        }

        result = result
            .filter((manifest) => include.some((match) => matchManifest(manifest, match)));
    }
    if (exclude) {
        result = result
            .filter((manifest) => !exclude.some((match) => matchManifest(manifest, match)));
    }
    if (modifier) {
        result = result.map((manifest) => {
            const modifiers = modifier
                .filter((match) => matchManifest(manifest, match[0]));
            if (modifiers.length > 0) {
                return modifiers.reduce((prev, curr) => ({
                    ...prev,
                    ...curr[1],
                }), manifest);
            }
            return manifest;
        });
    }
    return result;
};

export const fetchManifest = async (
    value: Repo,
    beforeDate: string | undefined,
): Promise<Manifest[]> => {
    switch (value.type) {
        case 'github-global': {
            const {
                owner, repo, branch, path,
            } = value;
            if (typeof beforeDate === 'string') {
                const sha = await getCommitDateBefore(owner, repo, branch, beforeDate);
                return (await fetch(`https://raw.githubusercontent.com/${owner}/${repo}/${sha}/${path}`)).json() as Promise<Manifest[]>;
            }
            return (await fetch(`https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${path}`)).json() as Promise<Manifest[]>;
        }
        case 'github-cn': {
            const {
                owner, repo, branch, path,
            } = value;
            return (await fetch(`https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${path}`)).json() as Promise<Manifest[]>;
        }
        case 'direct':
        case 'delay': {
            const headers = new Headers();
            headers.append('Accept', 'application/json');

            const { url } = value;
            return (await fetch(url, { headers })).json() as Promise<Manifest[]>;
        }
        default:
            value satisfies never;
            throw new Error('Unknown repo type');
    }
};
