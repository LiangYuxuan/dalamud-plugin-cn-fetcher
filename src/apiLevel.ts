import assert from 'assert';

import got from 'got';

import type { Commit } from './types/commits';

const parseAPILevel = async (repo: string, commit = 'master') => {
    const fileContent = (await got.get(`https://raw.githubusercontent.com/${repo}/${commit}/Dalamud/Plugin/Internal/PluginManager.cs`)).body;
    const apiLevelText = fileContent.match(/public const int DalamudApiLevel = (\d+);/);

    assert(apiLevelText, 'Failing to fetch DalamudApiLevel');

    return parseInt(apiLevelText[1], 10);
};

export default async () => {
    const [apiLevelCN, apiLevelGlobal] = await Promise.all([parseAPILevel('ottercorp/Dalamud'), parseAPILevel('goatcorp/Dalamud')]);

    console.log('DalamudApiLevel on CN Client: %d', apiLevelCN);
    console.log('DalamudApiLevel on Global Client: %d', apiLevelGlobal);

    const isGlobalGreater = apiLevelCN < apiLevelGlobal;
    if (isGlobalGreater) {
        let globalCommits = await got.get('https://api.github.com/repos/goatcorp/Dalamud/commits?path=Dalamud/Plugin/Internal/PluginManager.cs', {
            headers: {
                Authorization: process.env.GITHUB_TOKEN,
            },
        }).json() as Commit[];
        let apiLevelChangeDate = globalCommits[0].commit.committer?.date
            ?? globalCommits[0].commit.author?.date;

        let index = 1;
        let page = 2;
        while (globalCommits.length > 0) {
            // eslint-disable-next-line no-await-in-loop
            const apiLevel = await parseAPILevel('goatcorp/Dalamud', globalCommits[index].sha);
            if (apiLevel === apiLevelCN) {
                break;
            }

            apiLevelChangeDate = globalCommits[index].commit.committer?.date
                ?? globalCommits[index].commit.author?.date;

            index += 1;
            if (index >= globalCommits.length) {
                // eslint-disable-next-line no-await-in-loop
                globalCommits = await got.get(`https://api.github.com/repos/goatcorp/Dalamud/commits?page=${page}&path=Dalamud/Plugin/Internal/PluginManager.cs`, {
                    headers: {
                        Authorization: process.env.GITHUB_TOKEN,
                    },
                }).json() as Commit[];

                page += 1;
                index = 0;
            }
        }

        assert(apiLevelChangeDate, 'Failing to fetch DalamudApiLevel change date');

        console.log('DalamudApiLevel on Global Client changed on date %s', apiLevelChangeDate);

        return { isGlobalGreater, apiLevelChangeDate };
    }

    return { isGlobalGreater };
};
