import { useAuth, useClerk } from "@clerk/clerk-react";

function useSignOutAndCleanup() {
  const { getToken } = useAuth();
  const { signOut } = useClerk();

  const handleSignOut = async () => {
    try {
      const token = await getToken();
      await fetch("http://localhost:3000/api/auth/remove", {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
    } catch (error) {
      console.error("Failed to remove user data:", error);
    } finally {
      await signOut(); // always sign out, even if the delete call fails
    }
  };

  return handleSignOut;
}

export default useSignOutAndCleanup;