const userModel = require('../models/user.model');
const blackListTokenModel = require('../models/blacklistToken.model');
const jwt = require('jsonwebtoken');
const captainModel = require('../models/captain.model');

function getToken(req) {
    const authorization = req.headers.authorization;
    const bearerToken = authorization?.startsWith('Bearer ')
        ? authorization.slice(7)
        : null;

    return req.cookies?.token || bearerToken;
}

function unauthorized(res) {
    return res.status(401).json({ message: 'Unauthorized' });
}

function verifyToken(token) {
    try {
        return jwt.verify(token, process.env.JWT_SECRET);
    } catch (error) {
        return null;
    }
}

module.exports.authUser = async (req, res, next) => {
    const token = getToken(req);
    if (!token) {
        return unauthorized(res);
    }

    const decoded = verifyToken(token);
    if (!decoded?._id) {
        return unauthorized(res);
    }

    const [blacklisted, user] = await Promise.all([
        blackListTokenModel.exists({ token }),
        userModel.findById(decoded._id)
    ]);

    if (blacklisted || !user) {
        return unauthorized(res);
    }

    req.user = user;
    return next();
};

module.exports.authCaptain = async (req, res, next) => {
    const token = getToken(req);
    if (!token) {
        return unauthorized(res);
    }

    const decoded = verifyToken(token);
    if (!decoded?._id) {
        return unauthorized(res);
    }

    const [blacklisted, captain] = await Promise.all([
        blackListTokenModel.exists({ token }),
        captainModel.findById(decoded._id)
    ]);

    if (blacklisted || !captain) {
        return unauthorized(res);
    }

    req.captain = captain;
    return next();
};