const mongoose = require('mongoose');

const rideLocationSchema = new mongoose.Schema({
    latitude: {
        type: Number,
        required: true,
        min: -90,
        max: 90
    },
    longitude: {
        type: Number,
        required: true,
        min: -180,
        max: 180
    }
}, { _id: false });

const rideSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'user',
        required: true,
        index: true
    },
    pickup: {
        type: String,
        required: true,
        trim: true,
        minlength: 2,
        maxlength: 180
    },
    pickupLocation: {
        type: rideLocationSchema,
        required: true
    },
    destination: {
        type: String,
        required: true,
        trim: true,
        minlength: 2,
        maxlength: 180
    },
    destinationLocation: {
        type: rideLocationSchema,
        required: true
    },
    vehicleType: {
        type: String,
        required: true,
        enum: ['auto', 'motorcycle', 'car']
    },
    status: {
        type: String,
        enum: ['pending', 'cancelled'],
        default: 'pending',
        required: true
    }
}, { timestamps: true });

module.exports = mongoose.model('ride', rideSchema);
