import { ProfileForm } from "@/features/profile/ProfileForm";
import layoutStyles from "@/styles/layout.module.css";

export default function ProfilePage() {
  return (
    <div className={layoutStyles.pageContainer}>
      <ProfileForm />
    </div>
  );
}
