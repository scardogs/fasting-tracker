import dbConnect from '@/lib/mongodb';
import Hydration from '@/models/Hydration';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';

export default async function handler(req, res) {
    const { method } = req;
    const session = await getServerSession(req, res, authOptions);

    if (!session) {
        return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const userId = session.user.id;
    await dbConnect();

    switch (method) {
        case 'GET':
            try {
                // Get start and end of current day in user's local time (server time for now)
                const startOfDay = new Date();
                startOfDay.setHours(0, 0, 0, 0);

                const endOfDay = new Date();
                endOfDay.setHours(23, 59, 59, 999);

                const logs = await Hydration.find({
                    userId,
                    timestamp: { $gte: startOfDay, $lte: endOfDay },
                }).sort({ timestamp: -1 });

                const total = logs.reduce((sum, log) => sum + log.amount, 0);
                // Get the most recent goal or default to 2000
                const lastLog = await Hydration.findOne({ userId }).sort({ createdAt: -1 });
                const currentGoal = lastLog ? lastLog.goal : 2000;

                res.status(200).json({ success: true, data: { logs, total, goal: currentGoal } });
            } catch (error) {
                res.status(400).json({ success: false, error: error.message });
            }
            break;

        case 'POST':
            try {
                const { amount, goal } = req.body;

                // If amount is provided, create a new log
                if (amount) {
                    const newLog = await Hydration.create({
                        userId,
                        amount,
                        goal: goal || 2000,
                        timestamp: new Date(),
                    });
                    res.status(201).json({ success: true, data: newLog });
                } else if (goal) {
                    // Just update the goal (we'll do this by creating a 0ml log or similar, 
                    // but for now let's just allow setting a goal in the next log)
                    res.status(400).json({ success: false, error: 'Amount is required' });
                }
            } catch (error) {
                res.status(400).json({ success: false, error: error.message });
            }
            break;

        case 'DELETE':
            try {
                const { id } = req.body;
                await Hydration.findOneAndDelete({ _id: id, userId });
                res.status(200).json({ success: true });
            } catch (error) {
                res.status(400).json({ success: false, error: error.message });
            }
            break;

        default:
            res.status(400).json({ success: false, error: 'Method not allowed' });
            break;
    }
}
