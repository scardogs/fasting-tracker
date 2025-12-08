import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import styles from '@/styles/Auth.module.css';

export default function SignUp() {
    const router = useRouter();
    const [formData, setFormData] = useState({
        name: '',
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
            // Create user
            const response = await fetch('/api/auth/signup', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(formData),
            });

            const data = await response.json();

            if (!response.ok) {
                setError(data.message || 'Failed to create account');
                setLoading(false);
                return;
            }

            // Auto sign in after successful signup
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
                <title>Sign Up - Fasting Tracker</title>
                <meta name="viewport" content="width=device-width, initial-scale=1" />
            </Head>

            <div className={styles.authContainer}>
                <div className={styles.authCard}>
                    <h1 className={styles.authTitle}>Create Account</h1>
                    <p className={styles.authSubtitle}>Start tracking your fasting journey</p>

                    {error && (
                        <div className={styles.errorMessage}>
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className={styles.authForm}>
                        <div className={styles.formGroup}>
                            <label htmlFor="name" className={styles.formLabel}>Name</label>
                            <input
                                id="name"
                                type="text"
                                required
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                className={styles.formInput}
                                placeholder="Your name"
                            />
                        </div>

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
                                minLength={6}
                                value={formData.password}
                                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                className={styles.formInput}
                                placeholder="At least 6 characters"
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className={styles.submitButton}
                        >
                            {loading ? 'Creating account...' : 'Sign Up'}
                        </button>
                    </form>

                    <p className={styles.authFooter}>
                        Already have an account?{' '}
                        <Link href="/auth/signin" className={styles.authLink}>
                            Sign in
                        </Link>
                    </p>
                </div>
            </div>
        </>
    );
}
