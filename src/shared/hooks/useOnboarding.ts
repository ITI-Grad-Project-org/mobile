import * as SecureStore from "expo-secure-store";

// Persists whether the client has seen the onboarding walkthrough. Non-sensitive,
// but we use SecureStore (already a dependency) to avoid adding AsyncStorage.
const KEY = "uply.hasOnboarded";

// TEMP (dev only): set to true to always re-show onboarding, ignoring the saved
// flag. Remove / set back to false before shipping.
const ALWAYS_SHOW_ONBOARDING = __DEV__ && false;
}
