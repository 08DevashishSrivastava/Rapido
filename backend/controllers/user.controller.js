const userModel = require('../models/user.model');
const userService = require('../services/user.service');
const { validationResult } = require('express-validator');
const blackListTokenModel = require('../models/blacklistToken.model');

module.exports.registerUser = async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const { fullname, email, password } = req.body;
    const isUserAlready = await userModel.findOne({ email });

    if (isUserAlready) {
        return res.status(409).json({ message: 'An account with this email already exists' });
    }

    const hashedPassword = await userModel.hashPassword(password);
    const user = await userService.createUser({
        firstname: fullname.firstname.trim(),
        lastname: fullname.lastname?.trim() || undefined,
        email: email.trim().toLowerCase(),
        password: hashedPassword
    });
    const token = user.generateAuthToken();
    const userResponse = user.toObject();
    delete userResponse.password;

    return res.status(201).json({ token, user: userResponse });
};

module.exports.loginUser = async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const { email, password } = req.body;
    const user = await userModel.findOne({ email: email.trim().toLowerCase() }).select('+password');
    if (!user) {
        return res.status(401).json({ message: 'Invalid email or password' });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
        return res.status(401).json({ message: 'Invalid email or password' });
    }

    const token = user.generateAuthToken();
    const userResponse = user.toObject();
    delete userResponse.password;

    return res.status(200).json({ token, user: userResponse });
};

module.exports.getUserProfile = async (req, res) => {
    return res.status(200).json(req.user);
};

module.exports.logoutUser = async (req, res) => {
    const token = req.cookies?.token || (req.headers.authorization?.startsWith('Bearer ')
        ? req.headers.authorization.slice(7)
        : null);
    await blackListTokenModel.create({ token });
    res.clearCookie('token');
    return res.status(200).json({ message: 'Logged out' });
};