// Notification Service for Fasting Tracker

class NotificationService {
    constructor() {
        this.permission = 'default';
        this.registration = null;
    }

    // Request notification permission
    async requestPermission() {
        if (!('Notification' in window)) {
            console.log('This browser does not support notifications');
            return false;
        }

        if (Notification.permission === 'granted') {
            this.permission = 'granted';
            return true;
        }

        if (Notification.permission !== 'denied') {
            const permission = await Notification.requestPermission();
            this.permission = permission;
            return permission === 'granted';
        }

        return false;
    }

    // Register service worker
    async registerServiceWorker() {
        if ('serviceWorker' in navigator) {
            try {
                const registration = await navigator.serviceWorker.register('/sw.js');
                this.registration = registration;
                console.log('Service Worker registered:', registration);
                return registration;
            } catch (error) {
                console.error('Service Worker registration failed:', error);
                return null;
            }
        }
        return null;
    }

    // Show notification
    async showNotification(title, options = {}) {
        const hasPermission = await this.requestPermission();
        if (!hasPermission) {
            console.log('Notification permission denied');
            return;
        }

        const defaultOptions = {
            icon: '/icon-192.png',
            badge: '/icon-192.png',
            vibrate: [200, 100, 200],
            requireInteraction: true,
        };

        const notificationOptions = { ...defaultOptions, ...options };

        if (this.registration) {
            // Use service worker for persistent notifications
            await this.registration.showNotification(title, notificationOptions);
        } else {
            // Fallback to regular notification
            new Notification(title, notificationOptions);
        }
    }

    // Goal reached notification
    async notifyGoalReached(hours) {
        await this.showNotification('🎉 Fasting Goal Reached!', {
            body: `Congratulations! You've completed your ${hours}-hour fast!`,
            tag: 'goal-reached',
            data: { type: 'goal-reached', hours },
        });
    }

    // Milestone notification
    async notifyMilestone(milestone) {
        const messages = {
            '10_sessions': '🏆 10 fasting sessions completed!',
            '50_hours': '⭐ 50 total hours fasted!',
            '100_hours': '🌟 100 total hours fasted!',
            '7_day_streak': '🔥 7-day streak achieved!',
            '30_day_streak': '💪 30-day streak! You\'re unstoppable!',
        };

        const message = messages[milestone] || 'Milestone achieved!';

        await this.showNotification('Milestone Unlocked!', {
            body: message,
            tag: 'milestone',
            data: { type: 'milestone', milestone },
        });
    }

    // Reminder notification
    async notifyReminder(message) {
        await this.showNotification('Fasting Reminder', {
            body: message,
            tag: 'reminder',
            data: { type: 'reminder' },
        });
    }

    // Schedule notification (for future use with backend)
    scheduleNotification(title, body, delay) {
        setTimeout(() => {
            this.showNotification(title, { body });
        }, delay);
    }
}

export default new NotificationService();
