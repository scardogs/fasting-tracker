import mongoose from 'mongoose';

const HydrationSchema = new mongoose.Schema(
    {
        userId: {
            type: String,
            required: true,
            index: true,
        },
        amount: {
            type: Number, // Amount in ml
            required: true,
        },
        timestamp: {
            type: Date,
            default: Date.now,
            index: true,
        },
        goal: {
            type: Number, // Daily goal in ml
            default: 2000,
        },
    },
    {
        timestamps: true,
    }
);

// Index for fetching a user's hydration logs for a specific day efficiently
HydrationSchema.index({ userId: 1, timestamp: -1 });

export default mongoose.models.Hydration || mongoose.model('Hydration', HydrationSchema);
