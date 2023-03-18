import fs from 'fs/promises';

import apiLevel from './apiLevel.js';
import {
    getManifest, getManifestDateBefore, getManifestGH, getManifestDateBeforeGH,
} from './url.js';

import type { Manifest } from './types/manifest.js';

const globalPlugins = [
    'https://raw.githubusercontent.com/daemitus/MyDalamudPlugins/master/pluginmaster.json',
    'https://raw.githubusercontent.com/lichie567/XIVAuras/main/repo.json',
    'https://raw.githubusercontent.com/Bluefissure/DalamudPlugins/Bluefissure/pluginmaster.json',
    'https://raw.githubusercontent.com/reckhou/DalamudPlugins-Ori/api6/pluginmaster.json',
    'https://raw.githubusercontent.com/lichie567/LMeter/main/repo.json',
    'https://raw.githubusercontent.com/chalkos/Marketbuddy/main/repo.json',
    'https://raw.githubusercontent.com/carvelli/Dalamud-Plugins/master/dist/pluginmaster.json',
    // 'https://raw.githubusercontent.com/ArchiDog1998/RotationSolver/main/pluginmaster.json',
];

const CNPlugins = [
    'https://dalamud_cn_3rd.otters.cloud/plugins/all',
    'https://raw.githubusercontent.com/akira0245/DalamudPlugins/master/pluginmaster.json',
    'https://raw.githubusercontent.com/NukoOoOoOoO/DalamudPlugins/dev/pluginmaster.json',
    'https://raw.githubusercontent.com/gamous/DalamudPluginsCN-Dev/main/MordionGaol.json',
    'https://raw.githubusercontent.com/44451516/XIVSlothCombo/CN/release/pluginmaster.json',
    'https://raw.githubusercontent.com/tssailzz8/MyPlugins/net7/pluginmaster.json',
    'https://raw.githubusercontent.com/emptyset0/Radar_akira0245/master/pluginmaster.json',
];

const mainHandler = async () => {
    const apiLevelResult = await apiLevel();

    const result = [] as Manifest[];
    const resultGH = [] as Manifest[];

    if (apiLevelResult.isGlobalGreater) {
        const { apiLevelChangeDate } = apiLevelResult;

        (await Promise.all(globalPlugins
            .map((data) => getManifestDateBefore(data, apiLevelChangeDate))))
            .forEach((data) => result.push(...data));

        (await Promise.all(globalPlugins
            .map((data) => getManifestDateBeforeGH(data, apiLevelChangeDate))))
            .forEach((data) => resultGH.push(...data));
    } else {
        (await Promise.all(globalPlugins
            .map(getManifest)))
            .forEach((data) => result.push(...data));

        (await Promise.all(globalPlugins
            .map(getManifestGH)))
            .forEach((data) => resultGH.push(...data));
    }

    (await Promise.all(CNPlugins
        .map(getManifest)))
        .forEach((data) => result.push(...data));

    (await Promise.all(CNPlugins
        .map(getManifestGH)))
        .forEach((data) => resultGH.push(...data));

    fs.writeFile('pluginmaster.json', JSON.stringify(result, undefined, 4));
    fs.writeFile('pluginmaster_gh.json', JSON.stringify(resultGH, undefined, 4));
};

mainHandler().catch((error) => {
    console.error(error);
    process.exitCode = -1;
});
