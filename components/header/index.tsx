import { Sparkles } from "lucide-react";
import styles from "./index.module.css";
         
type AppHeaderProps = {
  title?: string;
  subtitle?: string;
};

export default function FinanceHeader({
  title = "Meu Orçamento",
  subtitle = "Controle financeiro pessoal",
}: AppHeaderProps) {
  return (
    <header className={styles.header}>
      <div className={styles.inner}>
        <div className={styles.badge} aria-hidden="true">
          {/* Ícone (sparkle) em SVG */}
           <Sparkles className={styles.icon} />
        </div>

        <div className={styles.text}>
          <h1 className={styles.title}>{title}</h1>
          <p className={styles.subtitle}>{subtitle}</p>
        </div>
      </div>

      <div className={styles.divider} />
    </header>
  );
}