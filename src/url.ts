import assert from 'assert';

import got from 'got';

import type { Commit } from './types/commits.ts';
import type { Manifest } from './types/manifest.ts';
import type { Release } from './types/releases.ts';

const rawRegex = /https:\/\/raw\.githubusercontent\.com\/([^/]+)\/([^/]+)\/([^/]+)\/(.*)/;
const ghRawRegex = /https:\/\/(?:www\.)?github\.com\/([^/]+)\/([^/]+)\/raw\/([^/]+)\/(.*)/;
const ghReleaseRegex = /https:\/\/(?:www\.)?github\.com\/([^/]+)\/([^/]+)\/releases\/download\/(.*)/;
const ghReleaseLatestRegex = /https:\/\/(?:www\.)?github\.com\/([^/]+)\/([^/]+)\/releases\/latest\/download\/(.*)/;

const commitCache = new Map<string, string>();
export const getCommitDateBefore = async (
    owner: string,
    repo: string,
    branch: string,
    beforeDate: string,
) => {
    const key = `${owner}/${repo}/${branch}/${beforeDate}`;
    const cache = commitCache.get(key);
    if (cache) {
        return cache;
    }

    const commits: Commit[] = await got.get(`https://api.github.com/repos/${owner}/${repo}/commits?sha=${branch}&until=${beforeDate}&per_page=1`, {
        headers: {
            Authorization: process.env.GITHUB_TOKEN,
        },
    }).json();
    const { sha } = commits[0];

    commitCache.set(key, sha);
    return sha;
};

const releaseCache = new Map<string, string>();
export const getReleaseDateBefore = async (owner: string, repo: string, beforeDate: string) => {
    const key = `${owner}/${repo}/${beforeDate}`;
    const cache = releaseCache.get(key);
    if (cache) {
        return cache;
    }

    const date = new Date(beforeDate);

    let index = 0;
    let page = 1;
    let releases: Release[] = await got.get(`https://api.github.com/repos/${owner}/${repo}/releases`, {
        headers: {
            Authorization: process.env.GITHUB_TOKEN,
        },
    }).json();
    while (releases.length > 0) {
        const curr = new Date(releases[index].published_at ?? releases[index].created_at);
        if (curr < date) {
            const result = releases[index].tag_name;

            releaseCache.set(key, result);
            return result;
        }

        index += 1;
        if (index >= releases.length) {
            page += 1;
            index = 0;

            // eslint-disable-next-line no-await-in-loop
            releases = await got.get(`https://api.github.com/repos/${owner}/${repo}/releases?page=${page}`, {
                headers: {
                    Authorization: process.env.GITHUB_TOKEN,
                },
            }).json();
        }
    }

    return undefined;
};

const urlToProxy = (url: string) => {
    const rawResult = url.match(rawRegex) ?? url.match(ghRawRegex);
    if (rawResult) {
        const [, owner, repo, branch, tailing] = rawResult;
        // return `https://raw.fastgit.org/${owner}/${repo}/${branch}/${tailing}`;
        return `https://ghproxy.com/https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${tailing}`;
    }

    const releaseResult = url.match(ghReleaseRegex);
    if (releaseResult) {
        const [, owner, repo, tailing] = releaseResult;
        // return `https://download.fastgit.org/${owner}/${repo}/releases/download/${tailing}`;
        return `https://ghproxy.com/https://github.com/${owner}/${repo}/releases/download/${tailing}`;
    }

    const releaseLatestResult = url.match(ghReleaseLatestRegex);
    if (releaseLatestResult) {
        const [, owner, repo, tailing] = releaseLatestResult;
        // return `https://download.fastgit.org/${owner}/${repo}/releases/latest/download/${tailing}`;
        return `https://ghproxy.com/https://github.com/${owner}/${repo}/releases/latest/download/${tailing}`;
    }

    return url;
};

const urlToDateBefore = async (url: string, beforeDate: string) => {
    const rawResult = url.match(rawRegex) ?? url.match(ghRawRegex);
    if (rawResult) {
        const [, owner, repo, branch, tailing] = rawResult;
        const sha = await getCommitDateBefore(owner, repo, branch, beforeDate);

        assert(sha, `Failing to fetch commit of ${owner}/${repo} before ${beforeDate}`);

        return `https://raw.githubusercontent.com/${owner}/${repo}/${sha}/${tailing}`;
    }

    const releaseLatestResult = url.match(ghReleaseLatestRegex);
    if (releaseLatestResult) {
        const [, owner, repo, tailing] = releaseLatestResult;
        const tag = await getReleaseDateBefore(owner, repo, beforeDate);

        assert(tag, `Failing to fetch release of ${owner}/${repo} before ${beforeDate}`);

        return `https://github.com/${owner}/${repo}/releases/download/${tag}/${tailing}`;
    }

    return url;
};

export const manifestToProxy = (data: Manifest[]) => data.map((plugin) => {
    let {
        DownloadLinkInstall, DownloadLinkUpdate,
        DownloadLinkTesting, IconUrl, ImageUrls,
    } = plugin;

    if (DownloadLinkInstall) {
        DownloadLinkInstall = urlToProxy(DownloadLinkInstall);
    }

    if (DownloadLinkUpdate) {
        DownloadLinkUpdate = urlToProxy(DownloadLinkUpdate);
    }

    if (DownloadLinkTesting) {
        DownloadLinkTesting = urlToProxy(DownloadLinkTesting);
    }

    if (IconUrl) {
        IconUrl = urlToProxy(IconUrl);
    }

    if (ImageUrls) {
        ImageUrls = ImageUrls.map(urlToProxy);
    }

    return {
        ...plugin,
        DownloadLinkInstall,
        DownloadLinkUpdate,
        DownloadLinkTesting,
        IconUrl,
        ImageUrls,
    };
});

export const manifestToDateBefore = (
    data: Manifest[],
    beforeDate: string,
) => data.map(async (plugin) => {
    let {
        DownloadLinkInstall,
        DownloadLinkUpdate,
        DownloadLinkTesting,
    } = plugin;

    if (DownloadLinkInstall) {
        DownloadLinkInstall = await urlToDateBefore(DownloadLinkInstall, beforeDate);
    }

    if (DownloadLinkUpdate) {
        DownloadLinkUpdate = await urlToDateBefore(DownloadLinkUpdate, beforeDate);
    }

    if (DownloadLinkTesting) {
        DownloadLinkTesting = await urlToDateBefore(DownloadLinkTesting, beforeDate);
    }

    return {
        ...plugin,
        DownloadLinkInstall,
        DownloadLinkUpdate,
        DownloadLinkTesting,
    };
});
