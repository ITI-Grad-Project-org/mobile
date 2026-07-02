const { getDefaultConfig } = require("expo/metro-config");
const { withNativewind } = require("nativewind/metro");

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Add .mjs to sourceExts so Metro can resolve ESM files from modern modules
config.resolver.sourceExts.push("mjs");

module.exports = withNativewind(config, {
  input: "./src/global.css",
  // inlineVariables would break PlatformColor / light-dark() in CSS variables
  inlineVariables: false,
  // className support is added manually via the src/tw wrappers
  globalClassNamePolyfill: false,
});
