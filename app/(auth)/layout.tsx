import styles from "./layout.module.css";

type AuthLayoutProps = {
  children: React.ReactNode;
};

export default function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <div className={styles.root}>
      <main className={styles.card}>
        <span className={styles.wordmark}>Atlas</span>
        {children}
      </main>
    </div>
  );
}
