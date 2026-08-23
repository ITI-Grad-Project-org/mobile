import { useCallback, useEffect, useRef } from 'react';
import {
  GoogleSignin,
  isErrorWithCode,
  isSuccessResponse,
  statusCodes,
  type User,
} from '@react-native-google-signin/google-signin';

const WEB_CLIENT_ID =
  process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ||
  '191655688249-38mu3ochcungpot9oldojiet5ebi97e9.apps.googleusercontent.com';

// iOS needs its own OAuth client id — the native SDK cannot derive it from the
// web client id, and we ship no GoogleService-Info.plist. Must stay in sync with
// the `iosUrlScheme` configured for the google-signin plugin in app.json.
const IOS_CLIENT_ID =
  process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID ||
  '191655688249-k4b8cfd3li7sjidfmn1sf69ucraml06m.apps.googleusercontent.com';

/**
 * Thin wrapper around `@react-native-google-signin/google-signin` that
 * configures the SDK once and exposes a single `signInWithGoogle()` function
 * returning the ID token the backend needs.
 */
export function useGoogleAuth() {
  const configured = useRef(false);

  useEffect(() => {
    if (!configured.current) {
      GoogleSignin.configure({
        webClientId: WEB_CLIENT_ID,
        iosClientId: IOS_CLIENT_ID,
      });
      configured.current = true;
    }
  }, []);

  const signInWithGoogle = useCallback(async (): Promise<{
    idToken: string;
    user?: User['user'];
  } | null> => {
    try {
      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });

      // Sign out first to ensure the account chooser dialog is presented every time
      try {
        await GoogleSignin.signOut();
      } catch {
        // Ignore if user wasn't signed in
      }

      const response = await GoogleSignin.signIn();

      if (!isSuccessResponse(response)) {
        // User cancelled or no account picked — not an error.
        return null;
      }

      const idToken = response.data?.idToken;
      if (!idToken) {
        throw new Error('Google Sign-In succeeded but no ID token was returned.');
      }

      return {
        idToken,
        user: response.data?.user,
      };
    } catch (error) {
      if (isErrorWithCode(error)) {
        switch (error.code) {
          case statusCodes.SIGN_IN_CANCELLED:
            // User cancelled — not an error the UI should surface.
            return null;
          case statusCodes.IN_PROGRESS:
            // Another sign-in is already running.
            return null;
          case statusCodes.PLAY_SERVICES_NOT_AVAILABLE:
            throw new Error(
              'Google Play Services are not available on this device.',
            );
          default:
            throw new Error(
              error.message || 'Something went wrong with Google Sign-In.',
            );
        }
      }
      throw error;
    }
  }, []);

  return { signInWithGoogle };
}
