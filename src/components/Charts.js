import { LineChart, Line, AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { format, startOfWeek, endOfWeek, eachDayOfInterval, subDays, isWithinInterval } from 'date-fns';
import styles from '@/styles/Charts.module.css';

export default function Charts({ fastingHistory }) {
    // Calculate weekly trend data
    const getWeeklyTrend = () => {
        const last7Days = eachDayOfInterval({
            start: subDays(new Date(), 6),
            end: new Date(),
        });

        return last7Days.map(day => {
            const dayStart = new Date(day.setHours(0, 0, 0, 0));
            const dayEnd = new Date(day.setHours(23, 59, 59, 999));

            const daySessions = fastingHistory.filter(session => {
                const sessionDate = new Date(session.startTime);
                return sessionDate >= dayStart && sessionDate <= dayEnd;
            });

            const totalDuration = daySessions.reduce((sum, session) => sum + (session.duration / 3600), 0);

            return {
                date: format(day, 'MMM dd'),
                hours: parseFloat(totalDuration.toFixed(1)),
                sessions: daySessions.length,
            };
        });
    };

    // Calculate success rate over time
    const getSuccessRateTrend = () => {
        const last14Days = eachDayOfInterval({
            start: subDays(new Date(), 13),
            end: new Date(),
        });

        return last14Days.map(day => {
            const dayStart = new Date(day.setHours(0, 0, 0, 0));
            const dayEnd = new Date(day.setHours(23, 59, 59, 999));

            const daySessions = fastingHistory.filter(session => {
                const sessionDate = new Date(session.startTime);
                return sessionDate >= dayStart && sessionDate <= dayEnd;
            });

            const successfulSessions = daySessions.filter(s => s.goalReached).length;
            const successRate = daySessions.length > 0 ? (successfulSessions / daySessions.length) * 100 : 0;

            return {
                date: format(day, 'MMM dd'),
                rate: parseFloat(successRate.toFixed(1)),
            };
        });
    };

    // Calculate best fasting times (hour of day)
    const getBestFastingTimes = () => {
        const hourCounts = Array(24).fill(0).map((_, i) => ({ hour: i, count: 0, avgDuration: 0, totalDuration: 0 }));

        fastingHistory.forEach(session => {
            const startHour = new Date(session.startTime).getHours();
            hourCounts[startHour].count++;
            hourCounts[startHour].totalDuration += session.duration / 3600;
        });

        hourCounts.forEach(item => {
            if (item.count > 0) {
                item.avgDuration = parseFloat((item.totalDuration / item.count).toFixed(1));
            }
        });

        return hourCounts
            .filter(item => item.count > 0)
            .sort((a, b) => b.count - a.count)
            .slice(0, 8)
            .map(item => ({
                time: `${item.hour}:00`,
                sessions: item.count,
                avgHours: item.avgDuration,
            }));
    };

    // Calculate calendar heatmap data
    const getHeatmapData = () => {
        const last90Days = eachDayOfInterval({
            start: subDays(new Date(), 89),
            end: new Date(),
        });

        return last90Days.map(day => {
            const dayStart = new Date(day.setHours(0, 0, 0, 0));
            const dayEnd = new Date(day.setHours(23, 59, 59, 999));

            const daySessions = fastingHistory.filter(session => {
                const sessionDate = new Date(session.startTime);
                return sessionDate >= dayStart && sessionDate <= dayEnd;
            });

            const totalHours = daySessions.reduce((sum, session) => sum + (session.duration / 3600), 0);
            const hasSuccess = daySessions.some(s => s.goalReached);

            return {
                date: format(day, 'yyyy-MM-dd'),
                hours: parseFloat(totalHours.toFixed(1)),
                level: totalHours === 0 ? 0 : totalHours < 12 ? 1 : totalHours < 16 ? 2 : totalHours < 20 ? 3 : 4,
                hasSuccess,
            };
        });
    };

    const weeklyData = getWeeklyTrend();
    const successData = getSuccessRateTrend();
    const bestTimesData = getBestFastingTimes();
    const heatmapData = getHeatmapData();

    if (fastingHistory.length === 0) {
        return (
            <div className={styles.emptyState}>
                <p>Start fasting to see your analytics!</p>
            </div>
        );
    }

    return (
        <div className={styles.chartsContainer}>
            {/* Weekly Trend */}
            <div className={styles.chartCard}>
                <h3 className={styles.chartTitle}>Weekly Fasting Duration</h3>
                <ResponsiveContainer width="100%" height={250}>
                    <LineChart data={weeklyData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e9e7" />
                        <XAxis dataKey="date" stroke="#6b7c72" fontSize={12} />
                        <YAxis stroke="#6b7c72" fontSize={12} label={{ value: 'Hours', angle: -90, position: 'insideLeft' }} />
                        <Tooltip contentStyle={{ background: '#fff', border: '1px solid #e5e9e7', borderRadius: '8px' }} />
                        <Line type="monotone" dataKey="hours" stroke="#7c9885" strokeWidth={3} dot={{ fill: '#7c9885', r: 4 }} activeDot={{ r: 6 }} />
                    </LineChart>
                </ResponsiveContainer>
            </div>

            {/* Success Rate */}
            <div className={styles.chartCard}>
                <h3 className={styles.chartTitle}>Success Rate Trend</h3>
                <ResponsiveContainer width="100%" height={250}>
                    <AreaChart data={successData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e9e7" />
                        <XAxis dataKey="date" stroke="#6b7c72" fontSize={12} />
                        <YAxis stroke="#6b7c72" fontSize={12} label={{ value: '%', angle: -90, position: 'insideLeft' }} />
                        <Tooltip contentStyle={{ background: '#fff', border: '1px solid #e5e9e7', borderRadius: '8px' }} />
                        <Area type="monotone" dataKey="rate" stroke="#7c9885" fill="#a3bfac" fillOpacity={0.6} />
                    </AreaChart>
                </ResponsiveContainer>
            </div>

            {/* Best Fasting Times */}
            {bestTimesData.length > 0 && (
                <div className={styles.chartCard}>
                    <h3 className={styles.chartTitle}>Best Fasting Start Times</h3>
                    <ResponsiveContainer width="100%" height={250}>
                        <BarChart data={bestTimesData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#e5e9e7" />
                            <XAxis dataKey="time" stroke="#6b7c72" fontSize={12} />
                            <YAxis stroke="#6b7c72" fontSize={12} />
                            <Tooltip contentStyle={{ background: '#fff', border: '1px solid #e5e9e7', borderRadius: '8px' }} />
                            <Legend />
                            <Bar dataKey="sessions" fill="#7c9885" radius={[8, 8, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            )}

            {/* Calendar Heatmap */}
            <div className={styles.chartCard}>
                <h3 className={styles.chartTitle}>90-Day Activity Heatmap</h3>
                <div className={styles.heatmapContainer}>
                    {heatmapData.map((day, index) => (
                        <div
                            key={day.date}
                            className={`${styles.heatmapCell} ${styles[`level${day.level}`]}`}
                            title={`${day.date}: ${day.hours}h${day.hasSuccess ? ' ✓' : ''}`}
                        />
                    ))}
                </div>
                <div className={styles.heatmapLegend}>
                    <span>Less</span>
                    <div className={`${styles.legendCell} ${styles.level0}`} />
                    <div className={`${styles.legendCell} ${styles.level1}`} />
                    <div className={`${styles.legendCell} ${styles.level2}`} />
                    <div className={`${styles.legendCell} ${styles.level3}`} />
                    <div className={`${styles.legendCell} ${styles.level4}`} />
                    <span>More</span>
                </div>
            </div>
        </div>
    );
}
