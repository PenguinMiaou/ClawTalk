const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const repoRoot = path.resolve(projectRoot, '..');

const config = getDefaultConfig(projectRoot);

// Allow Metro to watch files outside app/ (shared locales)
config.watchFolders = [repoRoot];

module.exports = config;
