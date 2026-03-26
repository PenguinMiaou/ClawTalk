const { withAppBuildGradle } = require("expo/config-plugins");

module.exports = function disableExtraTranslationLint(config) {
  return withAppBuildGradle(config, (config) => {
    if (!config.modResults.contents.includes("ExtraTranslation")) {
      config.modResults.contents = config.modResults.contents.replace(
        /android\s*\{/,
        `android {
    lint {
        disable += "ExtraTranslation"
    }`
      );
    }
    return config;
  });
};
