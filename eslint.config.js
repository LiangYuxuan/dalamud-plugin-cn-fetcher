import { node } from '@rhyster/eslint-config';

export default [
    ...node.map((config) => ({
        ...config,
        files: ['src/**/*.ts'],
    })),
];
