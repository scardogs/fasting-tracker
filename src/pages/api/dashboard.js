import dbConnect from '@/lib/mongodb';
import Session from '@/models/Session';
import Hydration from '@/models/Hydration';
import MoodLog from '@/models/MoodLog';
import { getServerSession } from 'next-auth/next';
import { authOptions } from './auth/[...nextauth]';

export default async function handler(req, res) {
    if (req.method !== 'GET') {
        return res.status(405).json({ success: false, error: 'Method not allowed' });
    }

    const session = await getServerSession(req, res, authOptions);

    if (!session) {
        return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const userId = session.user.id;
    await dbConnect();

    try {
        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);

        const endOfDay = new Date();
        endOfDay.setHours(23, 59, 59, 999);

        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

        // Fetch everything in parallel with field selection and lean queries
        const [activeSession, history, hydrationLogs, moodLogs] = await Promise.all([
            Session.findOne({ userId, isActive: true })
                .select('startTime goalHours')
                .lean(),
            Session.find({ userId, isActive: false })
                .select('startTime endTime duration goalHours goalReached notes')
                .sort({ createdAt: -1 })
                .limit(20)
                .lean(),
            Hydration.find({ userId, timestamp: { $gte: startOfDay, $lte: endOfDay } })
                .select('amount timestamp goal')
                .sort({ timestamp: -1 })
                .lean(),
            MoodLog.find({ userId, timestamp: { $gte: sevenDaysAgo } })
                .select('mood energy timestamp notes')
                .sort({ timestamp: -1 })
                .lean()
        ]);

        const hydrationTotal = hydrationLogs.reduce((sum, log) => sum + log.amount, 0);

        // Get the most recent hydration goal
        const lastHydration = await Hydration.findOne({ userId }).sort({ createdAt: -1 }).lean();
        const hydrationGoal = lastHydration ? lastHydration.goal : 2000;

        res.status(200).json({
            success: true,
            data: {
                activeSession,
                history,
                hydration: {
                    logs: hydrationLogs,
                    total: hydrationTotal,
                    goal: hydrationGoal
                },
                moodLogs
            }
        });
    } catch (error) {
        console.error('Dashboard API Error:', error);
        res.status(500).json({ success: false, error: 'Server Error' });
    }
}
