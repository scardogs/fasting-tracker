import mongoose from 'mongoose';

const MoodLogSchema = new mongoose.Schema(
    {
        userId: {
            type: String,
            required: true,
            index: true,
        },
        mood: {
            type: String, // Emoji or label (e.g., '😀', 'neutral')
            required: true,
        },
        energy: {
            type: Number, // 1-5 scale
            required: true,
            min: 1,
            max: 5,
        },
        timestamp: {
            type: Date,
            default: Date.now,
            index: true,
        },
        notes: {
            type: String,
            default: '',
            maxlength: 200,
        },
    },
    {
        timestamps: true,
    }
);

// Index for fetching logs for a specific day
MoodLogSchema.index({ userId: 1, timestamp: -1 });

export default mongoose.models.MoodLog || mongoose.model('MoodLog', MoodLogSchema);
