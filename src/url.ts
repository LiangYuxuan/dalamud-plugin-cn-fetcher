/* eslint-disable @typescript-eslint/naming-convention */

import assert from 'node:assert';

import type { Commit } from './types/commits.ts';
import type { Manifest } from './types/manifest.ts';
import type { Release } from './types/releases.ts';

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
    const cache = commitCache.get(key);
    if (typeof cache === 'string') {
        return cache;
    }

    const headers = new Headers();
    headers.set('Authorization', process.env.GITHUB_TOKEN ?? '');

    const req = await fetch(`https://api.github.com/repos/${owner}/${repo}/commits?sha=${branch}&until=${beforeDate}&per_page=1`, { headers });
    const commits = await req.json() as Commit[];
    const { sha } = commits[0];

    commitCache.set(key, sha);
    return sha;
};

const releaseCache = new Map<string, string>();
const getReleaseDateBefore = async (owner: string, repo: string, beforeDate: string) => {
    const key = `${owner}/${repo}/${beforeDate}`;
    const cache = releaseCache.get(key);
    if (typeof cache === 'string') {
        return cache;
    }

    const date = new Date(beforeDate);
    const headers = new Headers();
    headers.set('Authorization', process.env.GITHUB_TOKEN ?? '');

    let index = 0;
    let page = 1;
    let releases = await fetch(`https://api.github.com/repos/${owner}/${repo}/releases`, { headers })
        .then((res) => res.json() as Promise<Release[]>);
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
            releases = await fetch(`https://api.github.com/repos/${owner}/${repo}/releases?page=${page.toString()}`, { headers })
                .then((res) => res.json() as Promise<Release[]>);
        }
    }

    return undefined;
};

const urlToProxy = (url: string) => {
    const rawResult = rawRegex.exec(url) ?? ghRawRegex.exec(url);
    if (rawResult) {
        const [
            ,
            owner,
            repo,
            branch,
            tailing,
        ] = rawResult;
        // return `https://raw.fastgit.org/${owner}/${repo}/${branch}/${tailing}`;
        return `https://ghproxy.com/https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${tailing}`;
    }

    const releaseResult = ghReleaseRegex.exec(url);
    if (releaseResult) {
        const [
            ,
            owner,
            repo,
            tailing,
        ] = releaseResult;
        // return `https://download.fastgit.org/${owner}/${repo}/releases/download/${tailing}`;
        return `https://ghproxy.com/https://github.com/${owner}/${repo}/releases/download/${tailing}`;
    }

    const releaseLatestResult = ghReleaseLatestRegex.exec(url);
    if (releaseLatestResult) {
        const [
            ,
            owner,
            repo,
            tailing,
        ] = releaseLatestResult;
        // return `https://download.fastgit.org/${owner}/${repo}/releases/latest/download/${tailing}`;
        return `https://ghproxy.com/https://github.com/${owner}/${repo}/releases/latest/download/${tailing}`;
    }

    return url;
};

const urlToDateBefore = async (url: string, beforeDate: string) => {
    const rawResult = rawRegex.exec(url) ?? ghRawRegex.exec(url);
    if (rawResult) {
        const [
            ,
            owner,
            repo,
            branch,
            tailing,
        ] = rawResult;
        const sha = await getCommitDateBefore(owner, repo, branch, beforeDate);

        assert(typeof sha === 'string', `Failing to fetch commit of ${owner}/${repo} before ${beforeDate}`);

        return `https://raw.githubusercontent.com/${owner}/${repo}/${sha}/${tailing}`;
    }

    const releaseLatestResult = ghReleaseLatestRegex.exec(url);
    if (releaseLatestResult) {
        const [
            ,
            owner,
            repo,
            tailing,
        ] = releaseLatestResult;
        const tag = await getReleaseDateBefore(owner, repo, beforeDate);

        assert(typeof tag === 'string', `Failing to fetch release of ${owner}/${repo} before ${beforeDate}`);

        return `https://github.com/${owner}/${repo}/releases/download/${tag}/${tailing}`;
    }

    return url;
};

export const updateManifestToProxy = (data: Manifest[]) => data.map((plugin) => {
    let {
        DownloadLinkInstall, DownloadLinkUpdate,
        DownloadLinkTesting, IconUrl, ImageUrls,
    } = plugin;

    if (typeof DownloadLinkInstall === 'string') {
        DownloadLinkInstall = urlToProxy(DownloadLinkInstall);
    }

    if (typeof DownloadLinkUpdate === 'string') {
        DownloadLinkUpdate = urlToProxy(DownloadLinkUpdate);
    }

    if (typeof DownloadLinkTesting === 'string') {
        DownloadLinkTesting = urlToProxy(DownloadLinkTesting);
    }

    if (typeof IconUrl === 'string') {
        IconUrl = urlToProxy(IconUrl);
    }

    if (typeof ImageUrls === 'object') {
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

export const updateManifestToDateBefore = (
    data: Manifest[],
    beforeDate: string,
) => data.map(async (plugin) => {
    let {
        DownloadLinkInstall,
        DownloadLinkUpdate,
        DownloadLinkTesting,
    } = plugin;

    if (typeof DownloadLinkInstall === 'string') {
        DownloadLinkInstall = await urlToDateBefore(DownloadLinkInstall, beforeDate);
    }

    if (typeof DownloadLinkUpdate === 'string') {
        DownloadLinkUpdate = await urlToDateBefore(DownloadLinkUpdate, beforeDate);
    }

    if (typeof DownloadLinkTesting === 'string') {
        DownloadLinkTesting = await urlToDateBefore(DownloadLinkTesting, beforeDate);
    }

    return {
        ...plugin,
        DownloadLinkInstall,
        DownloadLinkUpdate,
        DownloadLinkTesting,
    };
});

export { getCommitDateBefore };
