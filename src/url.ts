/* eslint-disable @typescript-eslint/naming-convention */

import type { Manifest } from './types/manifest.ts';

const rawRegex = /https:\/\/raw\.githubusercontent\.com\/([^/]+)\/([^/]+)\/([^/]+)\/(.*)/;
const ghRawRegex = /https:\/\/(?:www\.)?github\.com\/([^/]+)\/([^/]+)\/raw\/([^/]+)\/(.*)/;
const ghReleaseRegex = /https:\/\/(?:www\.)?github\.com\/([^/]+)\/([^/]+)\/releases\/download\/(.*)/;
const ghReleaseLatestRegex = /https:\/\/(?:www\.)?github\.com\/([^/]+)\/([^/]+)\/releases\/latest\/download\/(.*)/;

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

// eslint-disable-next-line import-x/prefer-default-export
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
