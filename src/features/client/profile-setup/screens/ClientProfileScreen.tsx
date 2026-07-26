import { useLocalSearchParams, useRouter } from "expo-router";
import { ActivityIndicator } from "react-native";

import {
  useGetClientProfileQuery,
  useUpdateClientProfileMutation,
} from "@/api/endpoints/profile.endpoints";
import { SignupFlow, type ProfileData } from "@/features/shared/setup";
import { View } from "@/tw";
import { CLIENT_STEPS } from "../config";
import { clientDataToDto, clientProfileToData } from "../mapping";

export function ClientProfileScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    email?: string;
    fname?: string;
    lname?: string;
    edit?: string;
  }>();

  const isEdit = params.edit === "1";
  const [updateClient] = useUpdateClientProfileMutation();

  const { data: profile, isLoading } = useGetClientProfileQuery(undefined, {
    skip: !isEdit,
  });

  const save = async (data: ProfileData) => {
    const dto = isEdit
      ? await clientDataToDto(data)
      : await clientDataToDto({
          ...data,
          fname: params.fname ?? data.fname,
          lname: params.lname ?? data.lname,
        });
    await updateClient(dto).unwrap();
  };

  if (isEdit && isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <ActivityIndicator size="large" />
      </View>
    );
  }

  const initialData: ProfileData = isEdit
    ? clientProfileToData(profile)
    : {
        fname: params.fname ?? "",
        lname: params.lname ?? "",
        email: params.email ?? "",
      };

  return (
    <SignupFlow
      title={isEdit ? "Edit profile" : "Client profile"}
      steps={CLIENT_STEPS}
      initialData={initialData}
      uploadPersona="client"
      showWelcome={!isEdit}
      onClose={
        isEdit
          ? () => router.back()
          : () => router.replace("/(client)/(tabs)/today")
      }
      onSubmit={save}
      onDone={
        isEdit
          ? () => router.back()
          : () => router.replace("/(setup)/match-coach")
      }
      welcomeTitle="You're all set."
      welcomeBody="Profile saved. Let's get you matched with the right coach."
    />
  );
}
