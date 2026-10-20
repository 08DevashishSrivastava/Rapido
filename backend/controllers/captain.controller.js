const captainModel = require('../models/captain.model');
const captainService = require('../services/captain.service');
const { validationResult } = require('express-validator');
const blackListTokenModel = require('../models/blacklistToken.model');

function publicCaptain(captain) {
    const response = captain.toObject();
    delete response.password;
    return response;
}

module.exports.registerCaptain = async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const { fullname, email, password, vehicle } = req.body;
    const isCaptainAlreadyExist = await captainModel.findOne({ email: email.trim().toLowerCase() });
    if (isCaptainAlreadyExist) {
        return res.status(409).json({ message: 'An account with this email already exists' });
    }

    const hashedPassword = await captainModel.hashPassword(password);
    const captain = await captainService.createCaptain({
        firstname: fullname.firstname.trim(),
        lastname: fullname.lastname?.trim() || undefined,
        email: email.trim().toLowerCase(),
        password: hashedPassword,
        color: vehicle.color.trim(),
        plate: vehicle.plate.trim(),
        capacity: Number(vehicle.capacity),
        vehicleType: vehicle.vehicleType
    });
    const token = captain.generateAuthToken();
    return res.status(201).json({ token, captain: publicCaptain(captain) });
};

module.exports.loginCaptain = async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const { email, password } = req.body;
    const captain = await captainModel.findOne({ email: email.trim().toLowerCase() }).select('+password');
    if (!captain || !(await captain.comparePassword(password))) {
        return res.status(401).json({ message: 'Invalid email or password' });
    }

    await captain.updateOne({
        $set: { status: 'inactive' },
        $unset: { latitude: 1, longitude: 1, location: 1, locationUpdatedAt: 1 }
    });

    const token = captain.generateAuthToken();
    res.cookie('token', token, {
        httpOnly: true,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production'
    });
    return res.status(200).json({ token, captain: publicCaptain(captain) });
};

module.exports.getCaptainProfile = async (req, res) => {
    return res.status(200).json({ captain: req.captain });
};

module.exports.updateLocation = async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const latitude = Number(req.body.latitude);
    const longitude = Number(req.body.longitude);
    req.captain.latitude = latitude;
    req.captain.longitude = longitude;
    req.captain.location = {
        type: 'Point',
        coordinates: [longitude, latitude]
    };
    req.captain.locationUpdatedAt = new Date();
    req.captain.status = 'active';
    await req.captain.save();

    return res.status(200).json({
        status: req.captain.status,
        locationUpdatedAt: req.captain.locationUpdatedAt
    });
};

module.exports.stopLocationSharing = async (req, res) => {
    await req.captain.updateOne({
        $set: { status: 'inactive' },
        $unset: { latitude: 1, longitude: 1, location: 1, locationUpdatedAt: 1 }
    });

    return res.status(200).json({ status: 'inactive' });
};

module.exports.logoutCaptain = async (req, res) => {
    const token = req.cookies?.token || (req.headers.authorization?.startsWith('Bearer ')
        ? req.headers.authorization.slice(7)
        : null);
    await req.captain.updateOne({
        $set: { status: 'inactive' },
        $unset: { latitude: 1, longitude: 1, location: 1, locationUpdatedAt: 1 }
    });
    await blackListTokenModel.create({ token });
    res.clearCookie('token');
    return res.status(200).json({ message: 'Logged out' });
};