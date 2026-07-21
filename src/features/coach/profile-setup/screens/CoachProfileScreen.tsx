import { useLocalSearchParams, useRouter } from "expo-router";
import { ActivityIndicator } from "react-native";

import { useGetCoachProfileQuery, useUpdateCoachProfileMutation } from "@/api/endpoints/profile.endpoints";
import { SignupFlow, type ProfileData } from "@/features/shared/setup";
import { View } from "@/tw";
import { markProfileComplete } from "@/shared/hooks/useProfileSetup";
import { COACH_STEPS } from "../config";
import { coachDataToDto, coachProfileToData } from "../mapping";

export function CoachProfileScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    email?: string;
    fname?: string;
    lname?: string;
    edit?: string;
  }>();

  const isEdit = params.edit === "1";
  const [updateCoach] = useUpdateCoachProfileMutation();

  // Edit mode prefills from the current profile; the same query is already
  // cached by the profile modal, so this is usually instant.
  const { data: profile, isLoading } = useGetCoachProfileQuery(undefined, {
    skip: !isEdit,
  });

  const enterApp = () => router.replace("/(coach)/(tabs)/home");

  // Runs on Finish. First-time: PATCH the collected data + remember completion.
  // Edit: PATCH only. Navigation happens afterwards in onDone.
  const save = async (data: ProfileData) => {
    if (isEdit) {
      await updateCoach(await coachDataToDto(data)).unwrap();
      return;
    }
    const dto = await coachDataToDto({
      ...data,
      fname: params.fname ?? data.fname,
      lname: params.lname ?? data.lname,
    });
    await updateCoach(dto).unwrap();
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
      showWelcome={!isEdit}
      onClose={isEdit ? () => router.back() : enterApp}
      onSubmit={save}
      onDone={isEdit ? () => router.back() : enterApp}
      welcomeTitle="Profile ready."
      welcomeBody="Your coaching profile is set up. Let's get to work."
    />
  );
}
