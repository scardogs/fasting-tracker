import { signOut, useSession } from 'next-auth/react';
import styles from '@/styles/Header.module.css';
import { IoWater, IoPersonCircle, IoLogOutOutline } from 'react-icons/io5';

export default function Header() {
    const { data: session } = useSession();

    return (
        <header className={styles.header}>
            <div className={styles.container}>
                <div className={styles.logo}>
                    <div className={styles.logoIcon}>
                        <IoWater size={24} />
                    </div>
                    <span className={styles.logoText}>Fasting Tracker</span>
                </div>

                <nav className={styles.nav}>
                    <div className={styles.userInfo}>
                        <IoPersonCircle size={20} className={styles.userIcon} />
                        <span className={styles.userName}>{session?.user?.name || 'User'}</span>
                    </div>
                    <button
                        className={styles.logoutBtn}
                        onClick={() => signOut({ callbackUrl: '/auth/signin' })}
                    >
                        <IoLogOutOutline size={18} />
                        <span>Sign Out</span>
                    </button>
                </nav>
            </div>
        </header>
    );
}
