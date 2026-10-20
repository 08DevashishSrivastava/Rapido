const { validationResult } = require('express-validator');
const rideModel = require('../models/ride.model');
const captainModel = require('../models/captain.model');

function sendValidationErrors(req, res) {
    const errors = validationResult(req);
    if (errors.isEmpty()) {
        return false;
    }

    res.status(400).json({ errors: errors.array() });
    return true;
}

module.exports.createRide = async (req, res) => {
    if (sendValidationErrors(req, res)) {
        return;
    }

    const { pickup, destination, pickupLocation, destinationLocation, vehicleType } = req.body;
    const ride = await rideModel.create({
        user: req.user._id,
        pickup: pickup.trim(),
        destination: destination.trim(),
        pickupLocation: {
            latitude: Number(pickupLocation.latitude),
            longitude: Number(pickupLocation.longitude)
        },
        destinationLocation: {
            latitude: Number(destinationLocation.latitude),
            longitude: Number(destinationLocation.longitude)
        },
        vehicleType
    });

    return res.status(201).json({ ride });
};

module.exports.getRides = async (req, res) => {
    const rides = await rideModel.find({ user: req.user._id }).sort({ createdAt: -1 });
    return res.status(200).json({ rides });
};

module.exports.getNearbyCaptains = async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const latitude = Number(req.query.latitude);
    const longitude = Number(req.query.longitude);
    const radius = Math.min(Number(req.query.radius) || 5000, 10000);
    const filter = {
        status: 'active',
        locationUpdatedAt: { $gte: new Date(Date.now() - 90_000) },
        location: {
            $near: {
                $geometry: {
                    type: 'Point',
                    coordinates: [longitude, latitude]
                },
                $maxDistance: radius
            }
        }
    };

    if (req.query.vehicleType) {
        filter['vehicle.vehicleType'] = req.query.vehicleType;
    }

    const captains = await captainModel
        .find(filter)
        .select('vehicle.color vehicle.vehicleType location locationUpdatedAt')
        .limit(50)
        .lean();
    const vehicles = captains.map(captain => ({
        color: captain.vehicle.color,
        vehicleType: captain.vehicle.vehicleType,
        latitude: captain.location.coordinates[1],
        longitude: captain.location.coordinates[0],
        updatedAt: captain.locationUpdatedAt
    }));

    return res.status(200).json({ vehicles });
};

module.exports.getRide = async (req, res) => {
    if (sendValidationErrors(req, res)) {
        return;
    }

    const ride = await rideModel.findOne({ _id: req.params.id, user: req.user._id });
    if (!ride) {
        return res.status(404).json({ message: 'Ride not found' });
    }

    return res.status(200).json({ ride });
};

module.exports.cancelRide = async (req, res) => {
    if (sendValidationErrors(req, res)) {
        return;
    }

    const ride = await rideModel.findOne({ _id: req.params.id, user: req.user._id });
    if (!ride) {
        return res.status(404).json({ message: 'Ride not found' });
    }

    if (ride.status !== 'pending') {
        return res.status(409).json({ message: 'Only pending rides can be cancelled' });
    }

    ride.status = 'cancelled';
    await ride.save();
    return res.status(200).json({ ride });
};
