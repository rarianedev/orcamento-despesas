import Link from "next/link";
import styles from "./index.module.css";
import React from "react";
import Image from "next/image";

export default function Header() {
  return (
    <header className={styles.header}>
      <div className={styles.container}>

        {/* Logo */}
        <div className={styles.logo}>
          <span className={styles.logoDotGroup}>
            <span></span><span></span><span></span>
            <span></span><span></span>
          </span>
          <span className={styles.logoText}>
            <strong>brix</strong>
          </span>
        </div>

        {/* Search Bar */}
        <div className={styles.searchBox}>
          <Image
            src="/icones/Search.svg"
            alt="Search Icon"
            width={16}
            height={16}
            className={styles.searchIconLeft}
          />
          <input
            className={styles.searchInput}
            placeholder="Pesquisar por..."
            type="text"
          />
        </div>

        {/* Navigation Menu */}
        <nav className={styles.nav}>
          <a href="#">Página Inicial</a>
          <a href="#">Sobre</a>

          <div className={styles.dropdown}>
            <button className={styles.dropButton}>
              Recursos <span className={styles.chevron}>▾</span>
            </button>

            <div className={styles.dropdownContent}>
              <a href="#">Documentação</a>
              <a href="#">Guias</a>
              <a href="#">Tutoriais</a>
            </div>
          </div>

          <a href="#">Contato</a>
        </nav>
      </div>
    </header>
  );
}
