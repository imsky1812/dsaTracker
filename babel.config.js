module.exports = function (api) {
  api.cache(true);
  return {
    // babel-preset-expo covers expo-router since SDK 50 — listing the old
    // "expo-router/babel" plugin here is a hard bundling error on SDK 51.
    presets: ['babel-preset-expo'],
  };
};
