import assert from 'assert';

import got from 'got';

import type { Commit } from './types/commits';
import type { Manifest } from './types/manifest';
import type { Release } from './types/releases';

const rawRegex = /https:\/\/raw\.githubusercontent\.com\/([^/]+)\/([^/]+)\/([^/]+)\/(.*)/;
const ghRawRegex = /https:\/\/(?:www\.)?github\.com\/([^/]+)\/([^/]+)\/raw\/([^/]+)\/(.*)/;
const ghReleaseRegex = /https:\/\/(?:www\.)?github\.com\/([^/]+)\/([^/]+)\/releases\/download\/(.*)/;
const ghReleaseLatestRegex = /https:\/\/(?:www\.)?github\.com\/([^/]+)\/([^/]+)\/releases\/latest\/download\/(.*)/;

const commitCache = new Map<string, string>();
const getCommitDateBefore = async (
    owner: string,
    repo: string,
    branch: string,
    beforeDate: string,
) => {
    const key = `${owner}/${repo}/${branch}/${beforeDate}`;
    if (commitCache.has(key)) {
        return commitCache.get(key) as string;
    }

    const commits = await got.get(`https://api.github.com/repos/${owner}/${repo}/commits?sha=${branch}&until=${beforeDate}&per_page=1`, {
        headers: {
            Authorization: process.env.GITHUB_TOKEN,
        },
    }).json() as Commit[];
    const { sha } = commits[0];

    commitCache.set(key, sha);
    return sha;
};

const releaseCache = new Map<string, string>();
const getReleaseDateBefore = async (owner: string, repo: string, beforeDate: string) => {
    const key = `${owner}/${repo}/${beforeDate}`;
    if (releaseCache.has(key)) {
        return releaseCache.get(key) as string;
    }

    const date = new Date(beforeDate);

    let index = 0;
    let page = 1;
    let releases = await got.get(`https://api.github.com/repos/${owner}/${repo}/releases`, {
        headers: {
            Authorization: process.env.GITHUB_TOKEN,
        },
    }).json() as Release[];
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
            }).json() as Release[];
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

const manifestToProxy = (data: Manifest[]) => data.map((plugin) => {
    const result = plugin;

    result.DownloadLinkInstall = urlToProxy(result.DownloadLinkInstall);
    result.DownloadLinkUpdate = urlToProxy(result.DownloadLinkUpdate);
    result.DownloadLinkTesting = urlToProxy(result.DownloadLinkTesting);

    if (result.IconUrl) {
        result.IconUrl = urlToProxy(result.IconUrl);
    }

    if (result.ImageUrls) {
        result.ImageUrls = result.ImageUrls.map(urlToProxy);
    }

    return result;
});

const manifestToDateBefore = (data: Manifest[], beforeDate: string) => data.map(async (plugin) => {
    const result = plugin;

    result.DownloadLinkInstall = await urlToDateBefore(result.DownloadLinkInstall, beforeDate);
    result.DownloadLinkUpdate = await urlToDateBefore(result.DownloadLinkUpdate, beforeDate);
    result.DownloadLinkTesting = await urlToDateBefore(result.DownloadLinkTesting, beforeDate);

    return result;
});

export const getManifest = async (
    url: string,
) => manifestToProxy(await got.get(url).json() as Manifest[]);

export const getManifestDateBefore = async (url: string, apiLevelChangeDate: string) => {
    const matchResult = url.match(rawRegex);
    assert(matchResult, `Unknown global plugin url ${url}`);

    const [, owner, repo, branch, tailing] = matchResult;

    const sha = await getCommitDateBefore(owner, repo, branch, apiLevelChangeDate);

    const data = await got.get(`https://raw.githubusercontent.com/${owner}/${repo}/${sha}/${tailing}`).json() as Manifest[];
    return manifestToProxy(await Promise.all(manifestToDateBefore(data, apiLevelChangeDate)));
};

export const getManifestGH = async (
    url: string,
) => await got.get(url).json() as Manifest[];

export const getManifestDateBeforeGH = async (url: string, apiLevelChangeDate: string) => {
    const matchResult = url.match(rawRegex);
    assert(matchResult, `Unknown global plugin url ${url}`);

    const [, owner, repo, branch, tailing] = matchResult;

    const sha = await getCommitDateBefore(owner, repo, branch, apiLevelChangeDate);

    const data = await got.get(`https://raw.githubusercontent.com/${owner}/${repo}/${sha}/${tailing}`).json() as Manifest[];
    return Promise.all(manifestToDateBefore(data, apiLevelChangeDate));
};
