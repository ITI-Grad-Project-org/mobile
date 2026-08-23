import { useCallback, useState } from "react";

import {
  useAddCoachCertificationMutation,
  useAddCoachTransformationPhotosMutation,
  useDeleteCoachAvatarMutation,
  useDeleteCoachCertificationMutation,
  useDeleteCoachTransformationPhotoMutation,
  useSetCoachAvatarMutation,
} from "@/api/endpoints/coachMedia.endpoints";
import { useUpdateCoachProfileMutation } from "@/api/endpoints/profile.endpoints";
import { isLocalFileUri } from "@/api/formData";
import type { Certificate, ProfileData } from "@/features/shared/setup";

import { coachDataToCertificates, coachDataToProfileFields, uriList } from "./mapping";

export class MediaPartialFailure extends Error {
  readonly failures: string[];

  constructor(failures: string[]) {
    super(
      `Your details were saved, but some files didn't upload:\n${failures.join("\n")}`
    );
    this.name = "MediaPartialFailure";
    this.failures = failures;
  }
}

/** What the save is currently doing, for the button label. */
export type SaveStage =
  | "idle"
  | "profile"
  | "avatar"
  | "photos"
  | "certificates";

const STAGE_LABEL: Record<SaveStage, string> = {
  idle: "",
  profile: "Saving profile…",
  avatar: "Uploading photo…",
  photos: "Uploading photos…",
  certificates: "Uploading certificates…",
};

function certsOf(profile: any): { id: string; name?: string }[] {
  return Array.isArray(profile?.certifications)
    ? profile.certifications
        .map((c: any) => ({ id: c.id ?? c.certificationId, name: c.name }))
        .filter((c: any) => typeof c.id === "string")
    : [];
}

export function useSaveCoachProfile() {
  const [updateProfile] = useUpdateCoachProfileMutation();
  const [setAvatar] = useSetCoachAvatarMutation();
  const [deleteAvatar] = useDeleteCoachAvatarMutation();
  const [addPhotos] = useAddCoachTransformationPhotosMutation();
  const [deletePhoto] = useDeleteCoachTransformationPhotoMutation();
  const [addCertification] = useAddCoachCertificationMutation();
  const [deleteCertification] = useDeleteCoachCertificationMutation();

  const [stage, setStage] = useState<SaveStage>("idle");

  const save = useCallback(
    async (data: ProfileData, currentProfile?: any) => {
      // 1. Text fields — small, fast, and never held hostage by an upload.
      setStage("profile");
      try {
        await updateProfile({ data: coachDataToProfileFields(data) }).unwrap();
      } catch (e) {
        setStage("idle");
        throw e;
      }

      // Media steps are best-effort as a group: collect what failed rather than
      // aborting, so one bad photo doesn't discard the rest of the work.
      const failures: string[] = [];
      const run = async (label: string, task: () => Promise<unknown>) => {
        try {
          await task();
        } catch (e: any) {
          failures.push(`${label}: ${e?.data ?? e?.message ?? "upload failed"}`);
        }
      };

      // 2. Avatar — only when it actually changed. A remote URL means the user
      //    left the existing photo alone; there is nothing to re-upload.
      const nextAvatar = typeof data.avatar === "string" ? data.avatar.trim() : "";
      const prevAvatar: string = currentProfile?.avatarUrl ?? currentProfile?.avatar ?? "";
      if (isLocalFileUri(nextAvatar)) {
        setStage("avatar");
        await run("Profile photo", () => setAvatar({ uri: nextAvatar }).unwrap());
      } else if (!nextAvatar && prevAvatar) {
        setStage("avatar");
        await run("Profile photo", () => deleteAvatar().unwrap());
      }

      // 3. Transformation photos — deletion matches on the exact URL string.
      const nextPhotos = uriList(data.transformations);
      const prevPhotos: string[] = Array.isArray(currentProfile?.transformationPhotos)
        ? currentProfile.transformationPhotos
        : [];
      const removedPhotos = prevPhotos.filter((url) => !nextPhotos.includes(url));
      const addedPhotos = nextPhotos.filter(isLocalFileUri);

      if (removedPhotos.length || addedPhotos.length) {
        setStage("photos");
        await Promise.all(
          removedPhotos.map((url) =>
            run("Remove photo", () => deletePhoto({ url }).unwrap())
          )
        );
        if (addedPhotos.length) {
          await run("Transformation photos", () =>
            addPhotos({ uris: addedPhotos }).unwrap()
          );
        }
      }

      // 4. Certificates — rows carrying a server id already exist; anything else
      //    with a freshly picked file is new. The endpoint REQUIRES a file, so a
      //    row without one can't be created and is reported instead of silently
      //    vanishing.
      const nextCerts = coachDataToCertificates(data);
      const prevCerts = certsOf(currentProfile);
      const keptIds = new Set(nextCerts.map((c) => c.id));
      const removedCerts = prevCerts.filter((c) => !keptIds.has(c.id));
      const prevIds = new Set(prevCerts.map((c) => c.id));
      const addedCerts = nextCerts.filter((c) => !prevIds.has(c.id));

      if (removedCerts.length || addedCerts.length) {
        setStage("certificates");
        await Promise.all([
          ...removedCerts.map((c) =>
            run(`Remove ${c.name ?? "certificate"}`, () =>
              deleteCertification({ certificationId: c.id }).unwrap()
            )
          ),
          ...addedCerts.map((c: Certificate) => {
            if (!isLocalFileUri(c.image)) {
              failures.push(
                `${c.name || "Certificate"}: attach a scan or PDF — it can't be saved without one`
              );
              return Promise.resolve();
            }
            return run(c.name || "Certificate", () =>
              addCertification({
                name: c.name || "Certificate",
                ...(c.issued ? { issueDate: c.issued } : {}),
                ...(c.expires ? { expiryDate: c.expires } : {}),
                fileUri: c.image,
              }).unwrap()
            );
          }),
        ]);
      }

      setStage("idle");
      if (failures.length) throw new MediaPartialFailure(failures);
    },
    [
      updateProfile,
      setAvatar,
      deleteAvatar,
      addPhotos,
      deletePhoto,
      addCertification,
      deleteCertification,
    ]
  );

  return { save, stage, stageLabel: STAGE_LABEL[stage] };
}
