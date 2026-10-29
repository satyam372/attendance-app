import { useMutation, useQueryClient } from "@tanstack/react-query";

import { useAuth } from "../auth/AuthContext.jsx";
import * as profile from "../lib/services/profile.js";

// Lists that show people carry photo_updated_at, so they refresh after a photo change.
function refreshPeople(queryClient) {
  for (const key of ["employees", "dashboard", "requests"]) queryClient.invalidateQueries({ queryKey: [key] });
}

/** Upload the cropped photo (a Blob); the signed-in user gets the new photo_updated_at. */
export function useUploadPhoto() {
  const { updateUser } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: profile.uploadPhoto,
    onSuccess: (user) => {
      updateUser(user);
      refreshPeople(queryClient);
    },
  });
}

export function useRemovePhoto() {
  const { user, updateUser } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: profile.removePhoto,
    onSuccess: () => {
      updateUser({ ...user, photo_updated_at: null });
      refreshPeople(queryClient);
    },
  });
}
