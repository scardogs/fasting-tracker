import dbConnect from '@/lib/mongodb';
import Session from '@/models/Session';
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
                // Get the current active session for the user
                const session = await Session.findOne({
                    userId: userId,
                    isActive: true,
                }).lean();

                if (!session) {
                    return res.status(200).json({ success: true, data: null });
                }

                res.status(200).json({ success: true, data: session });
            } catch (error) {
                console.error('Error fetching active session:', error);
                res.status(400).json({ success: false, error: error.message });
            }
            break;

        default:
            res.status(400).json({ success: false, error: 'Method not allowed' });
            break;
    }
}
