import { useState } from 'react'; // Rebuild trigger
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import styles from '@/styles/Auth.module.css';

export default function SignIn() {
    const router = useRouter();
    const [formData, setFormData] = useState({
        email: '',
        password: '',
    });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const result = await signIn('credentials', {
                redirect: false,
                email: formData.email,
                password: formData.password,
            });

            if (result.error) {
                setError(result.error);
            } else {
                router.push('/');
            }
        } catch (err) {
            setError('An error occurred. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            <Head>
                <title>Sign In - Fasting Tracker</title>
                <meta name="viewport" content="width=device-width, initial-scale=1" />
            </Head>

            <div className={styles.authContainer}>
                <div className={styles.authCard}>
                    <div className={styles.logoContainer}>
                        <img src="/android-chrome-192x192.png" alt="App Logo" className={styles.authLogo} />
                    </div>
                    <div className={styles.authBrand}>
                        <h2 className={styles.authTitle}>Fasting Tracker</h2>
                        <b className={styles.authSubtitle} style={{ display: 'block', marginBottom: 0 }}>Welcome Back</b>
                    </div>
                    <p className={styles.authSubtitle}>Sign in to continue your fasting journey</p>

                    {error && (
                        <div className={styles.errorMessage}>
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className={styles.authForm}>
                        <div className={styles.formGroup}>
                            <label htmlFor="email" className={styles.formLabel}>Email</label>
                            <input
                                id="email"
                                type="email"
                                required
                                value={formData.email}
                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                className={styles.formInput}
                                placeholder="your@email.com"
                            />
                        </div>

                        <div className={styles.formGroup}>
                            <label htmlFor="password" className={styles.formLabel}>Password</label>
                            <input
                                id="password"
                                type="password"
                                required
                                value={formData.password}
                                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                className={styles.formInput}
                                placeholder="••••••••"
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className={styles.submitButton}
                        >
                            {loading ? 'Signing in...' : 'Sign In'}
                        </button>
                    </form>

                    <p className={styles.authFooter}>
                        Don't have an account?{' '}
                        <Link href="/auth/signup" className={styles.authLink}>
                            Sign up
                        </Link>
                    </p>
                </div>
            </div>
        </>
    );
}
