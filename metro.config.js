const { getDefaultConfig } = require("expo/metro-config");
const { withNativewind } = require("nativewind/metro");

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

module.exports = withNativewind(config, {
  input: "./src/global.css",
  // inlineVariables would break PlatformColor / light-dark() in CSS variables
  inlineVariables: false,
  // className support is added manually via the src/tw wrappers
  globalClassNamePolyfill: false,
});
