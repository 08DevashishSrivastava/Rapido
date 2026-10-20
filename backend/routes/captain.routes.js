const captainController = require('../controllers/captain.controller');
const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const authMiddleware = require('../middlewares/auth.middleware');

router.post('/register', [
    body('email')
        .isEmail()
        .withMessage('Invalid Email'),

    body('fullname.firstname')
        .trim()
        .isLength({ min: 3 })
        .withMessage('First name must be at least 3 characters long'),

    body('fullname.lastname')
        .optional({ values: 'falsy' })
        .trim()
        .isLength({ min: 3 })
        .withMessage('Last name must be at least 3 characters long'),

    body('password')
        .isLength({ min: 6 })
        .withMessage('Password must be at least 6 characters long'),

    body('vehicle.color')
        .trim()
        .isLength({ min: 3 })
        .withMessage('Color must be at least 3 characters long'),

    body('vehicle.plate')
        .trim()
        .isLength({ min: 3 })
        .withMessage('Plate must be at least 3 characters long'),

    body('vehicle.capacity').isInt({ min: 1 })
        .withMessage('Capacity must be at least 1'),

    body('vehicle.vehicleType')
        .isIn(['car', 'motorcycle', 'auto'])
        .withMessage('Invalid vehicle type')
], captainController.registerCaptain);

router.post('/login', [
    body('email')
        .isEmail()
        .withMessage('Invalid Email'),
    body('password')
        .isLength({ min: 6 })
        .withMessage('Password must be at least 6 characters long')
], captainController.loginCaptain);

router.get('/profile', authMiddleware.authCaptain, captainController.getCaptainProfile);
router.post('/location', authMiddleware.authCaptain, [
    body('latitude').isFloat({ min: -90, max: 90 }).withMessage('Latitude must be between -90 and 90'),
    body('longitude').isFloat({ min: -180, max: 180 }).withMessage('Longitude must be between -180 and 180')
], captainController.updateLocation);
router.post('/location/stop', authMiddleware.authCaptain, captainController.stopLocationSharing);
router.post('/logout', authMiddleware.authCaptain, captainController.logoutCaptain);

module.exports = router;
