import { Redirect } from "expo-router";


export default function Index() {
  // const role = useRole();
  const role = "owner";

  if (!role) {
    return <Redirect href="/(auth)/login" />;
  }

  return (
    <Redirect
      href={
        role === "owner"
          ? "/(coach)/(tabs)/home"
          : "/(client)/(tabs)/today"
      }
    />
  );
}
