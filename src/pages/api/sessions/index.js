import dbConnect from '@/lib/mongodb';
import Session from '@/models/Session';

export default async function handler(req, res) {
    const { method } = req;

    await dbConnect();

    switch (method) {
        case 'GET':
            try {
                // Get all completed sessions for the user, sorted by most recent
                const sessions = await Session.find({
                    userId: 'default-user',
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
                        userId: 'default-user',
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
                        userId: 'default-user',
                        startTime: new Date(sessionData.startTime),
                        goalHours: sessionData.goalHours,
                        isActive: true,
                    });

                    res.status(201).json({ success: true, data: session });
                } else if (action === 'stop') {
                    // Find and update the active session
                    const session = await Session.findOneAndUpdate(
                        {
                            userId: 'default-user',
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
                            userId: 'default-user',
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

        default:
            res.status(400).json({ success: false, error: 'Method not allowed' });
            break;
    }
}
