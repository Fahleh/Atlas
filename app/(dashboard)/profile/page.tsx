import { ProfileForm } from "@/features/profile/ProfileForm";
import styles from "./page.module.css";

export default function ProfilePage() {
  return (
    <div className={styles.pageContainer}>
      <ProfileForm />
    </div>
  );
}
