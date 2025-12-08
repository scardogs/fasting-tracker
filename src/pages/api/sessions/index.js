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
                // Get all completed sessions for the user, sorted by most recent
                const sessions = await Session.find({
                    userId: userId,
                    isActive: false,
                })
                    .sort({ createdAt: -1 })
                    .limit(50)
                    .lean();

                res.status(200).json({ success: true, data: sessions });
            } catch (error) {
                console.error('Error fetching sessions:', error);
                res.status(400).json({ success: false, error: error.message });
            }
            break;

        case 'POST':
            try {
                const { action, sessionData } = req.body;

                if (action === 'start') {
                    // Check if there's already an active session
                    const existingActive = await Session.findOne({
                        userId: userId,
                        isActive: true,
                    });

                    if (existingActive) {
                        return res.status(400).json({
                            success: false,
                            error: 'An active session already exists',
                        });
                    }

                    // Create new active session
                    const session = await Session.create({
                        userId: userId,
                        startTime: new Date(sessionData.startTime),
                        goalHours: sessionData.goalHours,
                        isActive: true,
                    });

                    res.status(201).json({ success: true, data: session });
                } else if (action === 'stop') {
                    // Find and update the active session
                    const session = await Session.findOneAndUpdate(
                        {
                            userId: userId,
                            isActive: true,
                        },
                        {
                            endTime: new Date(sessionData.endTime),
                            duration: sessionData.duration,
                            goalReached: sessionData.goalReached,
                            isActive: false,
                        },
                        { new: true }
                    );

                    if (!session) {
                        return res.status(404).json({
                            success: false,
                            error: 'No active session found',
                        });
                    }

                    res.status(200).json({ success: true, data: session });
                } else if (action === 'updateGoal') {
                    // Update the goal for the active session
                    const session = await Session.findOneAndUpdate(
                        {
                            userId: userId,
                            isActive: true,
                        },
                        {
                            goalHours: sessionData.goalHours,
                        },
                        { new: true }
                    );

                    if (!session) {
                        return res.status(404).json({
                            success: false,
                            error: 'No active session found',
                        });
                    }

                    res.status(200).json({ success: true, data: session });
                } else {
                    res.status(400).json({ success: false, error: 'Invalid action' });
                }
            } catch (error) {
                console.error('Error creating/updating session:', error);
                res.status(400).json({ success: false, error: error.message });
            }
            break;

        case 'DELETE':
            try {
                const { sessionId } = req.body;

                if (!sessionId) {
                    return res.status(400).json({
                        success: false,
                        error: 'Session ID is required',
                    });
                }

                const deletedSession = await Session.findByIdAndDelete(sessionId);

                if (!deletedSession) {
                    return res.status(404).json({
                        success: false,
                        error: 'Session not found',
                    });
                }

                res.status(200).json({ success: true, data: deletedSession });
            } catch (error) {
                console.error('Error deleting session:', error);
                res.status(400).json({ success: false, error: error.message });
            }
            break;

        default:
            res.status(400).json({ success: false, error: 'Method not allowed' });
            break;
    }
}
