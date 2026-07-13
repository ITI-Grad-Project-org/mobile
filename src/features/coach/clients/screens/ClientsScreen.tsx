import { clientsList, nutritionPlans, trainingPlans } from "@/lib/data";
import { cn } from "@/lib/utils";
import { Card } from "@/shared/ui/Card";
import { Icon } from "@/shared/ui/Icon";
import { SectionTitle } from "@/shared/ui/SectionTitle";
import { Pressable, ScrollView, Text, TextInput, View } from "@/tw";
import { Image } from "@/tw/image";
import { useState } from "react";
import { Modal, Platform } from "react-native";
import { GlassView, isLiquidGlassAvailable } from "expo-glass-effect";

// Apple Liquid Glass is iOS 26+ only — fall back to a frosted card elsewhere.
const LIQUID_GLASS = isLiquidGlassAvailable();

type Status = "All" | "Active" | "Paused" | "New";
type Client = (typeof clientsList)[number];

export function ClientsScreen() {
  const [filter, setFilter] = useState<Status>("All");
  const [search, setSearch] = useState("");
  const [active, setActive] = useState<Client | null>(null);

  const filtered = clientsList.filter(
    (c) =>
      (filter === "All" || c.status === filter) &&
      c.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <View className="flex-1 bg-background">
      <ScrollView
        className="flex-1"
        contentContainerClassName="gap-y-5 pt-5 pb-30"
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <View className="flex-row items-end justify-between px-1">
          <View>
            <Text className="text-[26px] font-bold tracking-tight text-foreground">Clients</Text>
            <Text className="text-[13.5px] text-muted-foreground mt-0.5">
              {clientsList.length} total · {clientsList.filter((c) => c.status === "Active").length} active
            </Text>
          </View>
          <Pressable className="h-10 w-10 justify-center items-center rounded-full bg-primary shadow-soft active:opacity-85">
            <Text className="text-primary-foreground text-lg font-bold">+</Text>
          </Pressable>
        </View>

        {/* Search & Filter bar */}
        {(() => {
          const searchControls = (
            <>
              <Icon name="search" size={16} color="--muted-foreground" />
              <TextInput
                placeholder="Search clients…"
                placeholderTextColor="#7c7c85"
                value={search}
                onChangeText={setSearch}
                className="flex-1 bg-transparent text-[14px] text-foreground p-0"
                autoCapitalize="none"
              />
              {search.length > 0 ? (
                <Pressable onPress={() => setSearch("")} className="p-1 active:opacity-70">
                  <Icon name="x" size={14} color="--muted-foreground" />
                </Pressable>
              ) : (
                <Icon name="filter" size={16} color="--muted-foreground" />
              )}
            </>
          );

          return LIQUID_GLASS ? (
            <GlassView
              glassEffectStyle="regular"
              isInteractive
              style={{
                flexDirection: "row",
                alignItems: "center",
                columnGap: 8,
                paddingHorizontal: 12,
                paddingVertical: 8,
                borderRadius: 9999,
              }}
            >
              {searchControls}
            </GlassView>
          ) : (
            <View className="flex-row items-center gap-x-2 rounded-full border border-border bg-card px-3 py-2 shadow-soft">
              {searchControls}
            </View>
          );
        })()}

        {/* Category Pills */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerClassName="gap-x-2 pb-1"
        >
          {(["All", "Active", "Paused", "New"] as Status[]).map((s) => (
            <Pressable
              key={s}
              onPress={() => setFilter(s)}
              className={cn(
                "shrink-0 rounded-full px-4 py-1.5 active:opacity-85",
                filter === s ? "bg-foreground" : "bg-secondary"
              )}
            >
              <Text
                className={cn(
                  "text-[12.5px] font-semibold",
                  filter === s ? "text-background" : "text-muted-foreground"
                )}
              >
                {s}
              </Text>
            </Pressable>
          ))}
        </ScrollView>

        {/* Roster list */}
        <View className="gap-y-3">
          {filtered.length > 0 ? (
            filtered.map((c) => (
              <Card
                key={c.id}
                interactive
                onPress={() => setActive(c)}
                className="flex-row items-center gap-x-3 p-3"
                glass
              >
                <Image
                  source={{ uri: c.avatar }}
                  className="h-12 w-12 shrink-0 rounded-2xl object-cover"
                />
                <View className="min-w-0 flex-1">
                  <View className="flex-row items-center gap-x-2">
                    <Text className="truncate text-[15px] font-semibold text-foreground" numberOfLines={1}>
                      {c.name}
                    </Text>
                    {c.status !== "Active" && (
                      <View
                        className={cn(
                          "shrink-0 rounded-full px-2 py-0.5",
                          c.status === "Paused" && "bg-sun",
                          c.status === "New" && "bg-mint"
                        )}
                      >
                        <Text
                          className={cn(
                            "text-[10px] font-semibold",
                            c.status === "Paused" && "text-sun-ink",
                            c.status === "New" && "text-mint-ink"
                          )}
                        >
                          {c.status}
                        </Text>
                      </View>
                    )}
                  </View>
                  <Text className="text-[12px] text-muted-foreground mt-0.5">
                    {c.goal} · last seen {c.last}
                  </Text>
                </View>
                <View className="shrink-0 items-end justify-center">
                  <Text
                    className={cn(
                      "text-[15px] font-bold",
                      c.adh >= 80
                        ? "text-success"
                        : c.adh >= 60
                          ? "text-warning"
                          : "text-destructive"
                    )}
                  >
                    {c.adh}%
                  </Text>
                  <Text className="text-[10px] text-muted-foreground mt-0.5">adherence</Text>
                </View>
              </Card>
            ))
          ) : (
            <View className="py-12 items-center justify-center">
              <Text className="text-[14px] text-muted-foreground">No clients found</Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Detail drawer sheet */}
      <ClientDetail client={active} onClose={() => setActive(null)} />
    </View>
  );
}

function ClientDetail({ client, onClose }: { client: Client | null; onClose: () => void }) {
  const [picked, setPicked] = useState<Record<string, boolean>>({});
  const [confirmed, setConfirmed] = useState(false);

  if (!client) return null;

  const count = Object.values(picked).filter(Boolean).length;
  const isIOS = Platform.OS === "ios";

  const handleClose = () => {
    setPicked({});
    setConfirmed(false);
    onClose();
  };

  const content = (
    <View className="flex-1 bg-card px-5 pt-3 pb-8">
      {/* Notch handle indicator */}
      <View className="mx-auto mb-4 h-1.5 w-10 rounded-full bg-border" />

      {/* Header */}
      <View className="flex-row items-start justify-between">
        <View className="flex-row items-center gap-x-3">
          <Image
            source={{ uri: client.avatar }}
            className="h-14 w-14 rounded-2xl object-cover"
          />
          <View>
            <Text className="text-[18px] font-bold leading-tight text-foreground">{client.name}</Text>
            <Text className="text-[12px] text-muted-foreground mt-0.5">
              {client.goal} · {client.adh}% adherence
            </Text>
          </View>
        </View>
        <Pressable
          onPress={handleClose}
          className="h-9 w-9 justify-center items-center rounded-full bg-secondary active:opacity-75"
        >
          <Icon name="x" size={16} color="--muted-foreground" />
        </Pressable>
      </View>

      {confirmed ? (
        <View className="my-8 items-center text-center justify-center flex-1">
          <View className="h-16 w-16 justify-center items-center rounded-full bg-success shadow-soft">
            <Icon name="check" size={32} color="#ffffff" />
          </View>
          <Text className="mt-4 text-[17px] font-bold text-foreground text-center">
            {count} plan{count !== 1 ? "s" : ""} assigned to {client.name}
          </Text>
          <Pressable
            onPress={handleClose}
            className="mt-6 w-full rounded-2xl bg-foreground py-3.5 active:opacity-90"
          >
            <Text className="text-center text-[14px] font-semibold text-background">Done</Text>
          </Pressable>
        </View>
      ) : (
        <ScrollView className="flex-1 mt-4" showsVerticalScrollIndicator={false}>
          {/* Training Plans */}
          <View>
            <SectionTitle
              title="Training plans"
              action={
                <View className="flex-row items-center gap-x-1">
                  <Icon name="clipboard-list" size={13} color="--muted-foreground" />
                  <Text className="text-[11px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
                    Training
                  </Text>
                </View>
              }
            />
            <View className="gap-y-2 mt-1 mb-4">
              {trainingPlans.map((p) => (
                <PickRow
                  key={p.id}
                  cover={p.cover}
                  title={p.name}
                  sub={`${p.weeks} weeks · ${p.days} d/wk`}
                  picked={!!picked[p.id]}
                  onToggle={() => setPicked((s) => ({ ...s, [p.id]: !s[p.id] }))}
                />
              ))}
            </View>
          </View>

          {/* Nutrition Plans */}
          <View>
            <SectionTitle
              title="Nutrition plans"
              action={
                <View className="flex-row items-center gap-x-1">
                  <Icon name="apple" size={13} color="--muted-foreground" />
                  <Text className="text-[11px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
                    Nutrition
                  </Text>
                </View>
              }
            />
            <View className="gap-y-2 mt-1 mb-4">
              {nutritionPlans.map((p) => (
                <PickRow
                  key={p.id}
                  cover={p.cover}
                  title={p.name}
                  sub={`${p.kcal} kcal · ${p.protein}g P`}
                  picked={!!picked[p.id]}
                  onToggle={() => setPicked((s) => ({ ...s, [p.id]: !s[p.id] }))}
                />
              ))}
            </View>
          </View>

          {/* Submit action */}
          <Pressable
            onPress={() => setConfirmed(true)}
            disabled={count === 0}
            className={cn(
              "mt-2 w-full rounded-2xl bg-primary py-4 shadow-soft active:opacity-90",
              count === 0 && "opacity-40"
            )}
          >
            <Text className="text-center text-[15px] font-semibold text-primary-foreground">
              Assign {count > 0 ? `${count} plan${count !== 1 ? "s" : ""}` : "plans"} to{" "}
              {client.name.split(" ")[0]}
            </Text>
          </Pressable>
        </ScrollView>
      )}
    </View>
  );

  if (isIOS) {
    return (
      <Modal
        visible={client !== null}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={handleClose}
      >
        {content}
      </Modal>
    );
  }

  return (
    <Modal
      visible={client !== null}
      transparent
      animationType="slide"
      statusBarTranslucent
      onRequestClose={handleClose}
    >
      <View className="flex-1 justify-end">
        <Pressable className="absolute inset-0 bg-black/40" onPress={handleClose} />
        <View className="min-h-[85%] w-full overflow-hidden shadow-pop bg-card rounded-t-3xl">
          {content}
        </View>
      </View>
    </Modal>
  );
}

function PickRow({
  cover,
  title,
  sub,
  picked,
  onToggle,
}: {
  cover: string;
  title: string;
  sub: string;
  picked: boolean;
  onToggle: () => void;
}) {
  return (
    <Pressable
      onPress={onToggle}
      className="flex-row w-full items-center gap-x-3 rounded-2xl bg-secondary/50 p-2 active:bg-secondary"
    >
      <Image source={{ uri: cover }} className="h-12 w-12 shrink-0 rounded-xl object-cover" />
      <View className="min-w-0 flex-1">
        <Text className="truncate text-[13.5px] font-semibold text-foreground" numberOfLines={1}>
          {title}
        </Text>
        <Text className="text-[11.5px] text-muted-foreground mt-0.5">{sub}</Text>
      </View>
      <View
        className={cn(
          "h-7 w-7 shrink-0 justify-center items-center rounded-full border-2",
          picked ? "border-primary bg-primary" : "border-border bg-card"
        )}
      >
        <Icon name="check" size={12} color={picked ? "#ffffff" : "transparent"} />
      </View>
    </Pressable>
  );
}
