import dbConnect from '@/lib/mongodb';
import MoodLog from '@/models/MoodLog';
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
                // Get mood logs for the last 7 days
                const sevenDaysAgo = new Date();
                sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

                const logs = await MoodLog.find({
                    userId,
                    timestamp: { $gte: sevenDaysAgo },
                }).sort({ timestamp: -1 });

                res.status(200).json({ success: true, data: logs });
            } catch (error) {
                res.status(400).json({ success: false, error: error.message });
            }
            break;

        case 'POST':
            try {
                const { mood, energy, notes } = req.body;
                const newLog = await MoodLog.create({
                    userId,
                    mood,
                    energy,
                    notes: notes || '',
                });
                res.status(201).json({ success: true, data: newLog });
            } catch (error) {
                res.status(400).json({ success: false, error: error.message });
            }
            break;

        case 'DELETE':
            try {
                const { id } = req.body;
                await MoodLog.findOneAndDelete({ _id: id, userId });
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
