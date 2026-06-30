module.exports = function (api) {
  api.cache(true);
  return {
    // NativeWind v5 / Tailwind v4 is CSS-first — no nativewind babel preset needed.
    // babel-preset-expo handles Reanimated 4 / worklets automatically on SDK 56.
    presets: ["babel-preset-expo"],
  };
};
