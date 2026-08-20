import { useGetClientsQuery } from "@/api/endpoints/clients.endpoints";
import { cn } from "@/lib/utils";
import { useActiveTenant } from "@/shared/hooks/useActiveTenant";
import { Icon } from "@/shared/ui/Icon";
import { Pressable, ScrollView, Text, View } from "@/tw";
import { useMemo, useState } from "react";
import { Modal } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export interface ScopedClient {
  membershipId: string;
  name: string;
}

interface Props {
  value: ScopedClient | null;
  onChange: (client: ScopedClient | null) => void;
  disabled?: boolean;
}

// `any`: getClients is declared `builder.query<any[], …>` — the roster payload
// has no OpenAPI response schema. Same reason for the `any` in the map below.
//
// A row is a MEMBERSHIP; the person hangs off `.client`. Mirrors the resolution
// in ClientsScreen — note the `||` chain: a missing first/last name joins to an
// empty string, which `??` would happily accept as a name and render blank.
function displayName(row: any): string {
  const person = row?.client || row;
  const firstName = person?.firstName || row?.firstName || "";
  const lastName = person?.lastName || row?.lastName || "";
  const full = `${firstName} ${lastName}`.trim();
  return full || person?.name || person?.email || row?.name || row?.email || "Client";
}

/**
 * Picks the `membershipId` an assistant question is scoped to.
 *
 * This is the difference between an answer grounded only in the coach's library
 * and one that can also see this client's intake (goals, injuries, conditions)
 * and check-ins. Retrieval covers at most ONE client at a time, so there is
 * deliberately no multi-select and no "all clients" option — a roster-wide
 * question ("which of my clients has a shoulder problem?") belongs to a REST
 * query over the database, not to the assistant.
 */
export function ClientScopePicker({ value, onChange, disabled }: Props) {
  const { tenantId } = useActiveTenant();
  const [open, setOpen] = useState(false);
  const insets = useSafeAreaInsets();

  const { data, isLoading } = useGetClientsQuery(
    { tenantId: tenantId ?? "" },
    { skip: !tenantId }
  );

  const clients = useMemo<ScopedClient[]>(
    () =>
      (data ?? [])
        // `id` is the membership id on this payload — the same resolution
        // ClientDetailSheet uses. A row without one cannot be scoped to.
        .map((c: any) => ({ membershipId: c?.id || c?.membershipId, name: displayName(c) }))
        .filter((c: ScopedClient) => Boolean(c.membershipId)),
    [data]
  );

  return (
    <>
      <Pressable
        onPress={() => setOpen(true)}
        disabled={disabled}
        className={cn(
          "mb-2 flex-row items-center gap-1.5 self-start rounded-full border px-3 py-1.5 active:opacity-80",
          // A selected client changes what the answer can see, so the chip is
          // tinted when scoped — it must not read as a neutral filter.
          value
            ? "border-primary/40 bg-primary/10"
            : "border-border/60 bg-card/70",
          disabled && "opacity-50"
        )}
        accessibilityLabel="Choose which client to ask about"
      >
        <Icon name={value ? "user" : "users"} size={13} color="--primary" />
        <Text className="text-[12.5px] font-medium text-foreground">
          {value ? `About ${value.name}` : "Ask about a client"}
        </Text>
        <Icon name="chevron-right" size={13} color="--muted-foreground" />
      </Pressable>

      <Modal
        visible={open}
        transparent
        animationType="slide"
        onRequestClose={() => setOpen(false)}
      >
        <Pressable className="flex-1 bg-black/40" onPress={() => setOpen(false)} />
        <View
          className="max-h-[60%] rounded-t-3xl border-t border-border/40 bg-card px-4 pt-4"
          style={{ paddingBottom: insets.bottom + 12 }}
        >
          <Text className="mb-1 text-[16px] font-bold text-foreground">Ask about</Text>
          <Text className="mb-3 text-[12.5px] text-muted-foreground">
            Pick a client to ground the answer in their intake and check-ins.
          </Text>

          <ScrollView showsVerticalScrollIndicator={false}>
            <Pressable
              onPress={() => {
                onChange(null);
                setOpen(false);
              }}
              className="flex-row items-center gap-3 rounded-2xl px-2 py-3 active:opacity-70"
            >
              <View className="h-8 w-8 items-center justify-center rounded-full bg-secondary">
                <Icon name="users" size={15} color="--muted-foreground" />
              </View>
              <View className="flex-1">
                <Text className="text-[14px] font-medium text-foreground">All clients</Text>
                <Text className="text-[11.5px] text-muted-foreground">
                  Your library and coaching corpus only
                </Text>
              </View>
              {!value && <Icon name="check" size={16} color="--primary" />}
            </Pressable>

            {isLoading && (
              <Text className="px-2 py-3 text-[13px] text-muted-foreground">
                Loading clients…
              </Text>
            )}

            {!isLoading && clients.length === 0 && (
              <Text className="px-2 py-3 text-[13px] text-muted-foreground">
                No clients yet.
              </Text>
            )}

            {clients.map((c) => (
              <Pressable
                key={c.membershipId}
                onPress={() => {
                  onChange(c);
                  setOpen(false);
                }}
                className="flex-row items-center gap-3 rounded-2xl px-2 py-3 active:opacity-70"
              >
                <View className="h-8 w-8 items-center justify-center rounded-full bg-primary/15">
                  <Icon name="user" size={15} color="--primary" />
                </View>
                <Text className="flex-1 text-[14px] font-medium text-foreground">{c.name}</Text>
                {value?.membershipId === c.membershipId && (
                  <Icon name="check" size={16} color="--primary" />
                )}
              </Pressable>
            ))}
          </ScrollView>
        </View>
      </Modal>
    </>
  );
}
