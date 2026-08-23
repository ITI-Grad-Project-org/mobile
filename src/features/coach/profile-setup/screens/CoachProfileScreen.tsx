import { useLocalSearchParams, useRouter } from "expo-router";
import { ActivityIndicator } from "react-native";

import { useGetCoachProfileQuery } from "@/api/endpoints/profile.endpoints";
import { SignupFlow, type ProfileData } from "@/features/shared/setup";
import { View } from "@/tw";
import { markProfileComplete } from "@/shared/hooks/useProfileSetup";
import { COACH_STEPS } from "../config";
import { coachProfileToData } from "../mapping";
import { MediaPartialFailure, useSaveCoachProfile } from "../useSaveCoachProfile";

export function CoachProfileScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    email?: string;
    fname?: string;
    lname?: string;
    edit?: string;
  }>();

  const isEdit = params.edit === "1";
  const { save: saveProfile, stageLabel } = useSaveCoachProfile();

  // Edit mode prefills from the current profile; the same query is already
  // cached by the profile modal, so this is usually instant.
  const { data: profile, isLoading } = useGetCoachProfileQuery(undefined, {
    skip: !isEdit,
  });

  const enterApp = () => router.replace("/(coach)/(tabs)/home");

  // Runs on Finish. `profile` is the server's current state — the save diffs
  // against it so unchanged photos are never re-uploaded. It's undefined on
  // first-time setup, which correctly makes every asset "new".
  const save = async (data: ProfileData) => {
    if (isEdit) {
      await saveProfile(data, profile);
      return;
    }
    try {
      await saveProfile(
        {
          ...data,
          fname: params.fname ?? data.fname,
          lname: params.lname ?? data.lname,
        },
        undefined
      );
    } catch (e) {
      // The fields are already saved when only files failed, so mark setup done
      // and let the coach retry the photos from Edit profile. Anything else
      // means nothing was saved — leave setup incomplete.
      if (!(e instanceof MediaPartialFailure)) throw e;
      await markProfileComplete(data);
      throw e;
    }
    await markProfileComplete(data);
  };

  if (isEdit && isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <ActivityIndicator size="large" />
      </View>
    );
  }

  const initialData: ProfileData = isEdit
    ? coachProfileToData(profile)
    : {
        fname: params.fname ?? "",
        lname: params.lname ?? "",
        email: params.email ?? "",
      };

  return (
    <SignupFlow
      title={isEdit ? "Edit profile" : "Coach profile"}
      steps={COACH_STEPS}
      initialData={initialData}
      uploadPersona="coach"
      showWelcome={!isEdit}
      onClose={isEdit ? () => router.back() : enterApp}
      onSubmit={save}
      savingLabel={stageLabel}
      onDone={isEdit ? () => router.back() : enterApp}
      welcomeTitle="Profile ready."
      welcomeBody="Your coaching profile is set up. Let's get to work."
    />
  );
}
