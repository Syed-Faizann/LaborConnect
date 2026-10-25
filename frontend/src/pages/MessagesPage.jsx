// frontend/src/pages/MessagesPage.jsx
import { useEffect } from "react";
import { useSearchParams } from "react-router";
import Navbar from "../components/Navbar";
import ChatBox from "../components/ChatBox";
import { useChatStore } from "../store/useChatStore";

export default function CustomerMessagesPage({ dbUser }) {
  const [searchParams] = useSearchParams();
  const targetUserId = searchParams.get("userId");
  const targetName = searchParams.get("name");
  const targetLogo = searchParams.get("logo");

  const { users, selectedUser, setSelectedUser } = useChatStore();

  useEffect(() => {
    // If no userId query param exists, do nothing (user can freely select any chat)
    if (!targetUserId) return;

    // Prevent re-setting if already active
    if (selectedUser?._id && String(selectedUser._id) === String(targetUserId)) {
      return;
    }

    const safeUsers = Array.isArray(users) ? users : [];
    const match = safeUsers.find((u) => u && String(u._id) === String(targetUserId));

    if (match) {
      setSelectedUser(match);
    } else {
      setSelectedUser({
        _id: targetUserId,
        fullName: targetName || "Company Support",
        companyName: targetName || "Company Support",
        profilePic: targetLogo || "",
        role: "company",
        companyRole: "manager",
        verified: true,
      });
    }
  }, [targetUserId]);

  return (
    <div className="flex min-h-screen flex-col bg-background font-body text-foreground overflow-x-hidden">
      <Navbar dbUser={dbUser} />
      <main className="mx-auto w-full max-w-[1280px] flex-1 px-3 py-4 sm:px-4 sm:py-6 md:px-10">
        <h1 className="mb-3 sm:mb-4 text-2xl font-bold">Messages</h1>
        <ChatBox
          placeholder="Type your message to the company manager..."
          headerSubtitle="Company Support"
        />
      </main>
    </div>
  );
}