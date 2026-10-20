const express = require('express');
const { body, param, query } = require('express-validator');
const rideController = require('../controllers/ride.controller');
const authMiddleware = require('../middlewares/auth.middleware');

const router = express.Router();

router.use(authMiddleware.authUser);

router.post('/', [
    body('pickup')
        .isString()
        .trim()
        .isLength({ min: 2, max: 180 })
        .withMessage('Pickup must be between 2 and 180 characters'),
    body('destination')
        .isString()
        .trim()
        .isLength({ min: 2, max: 180 })
        .withMessage('Destination must be between 2 and 180 characters'),
    body('pickupLocation.latitude')
        .isFloat({ min: -90, max: 90 })
        .withMessage('Select a pickup location on the map'),
    body('pickupLocation.longitude')
        .isFloat({ min: -180, max: 180 })
        .withMessage('Select a pickup location on the map'),
    body('destinationLocation.latitude')
        .isFloat({ min: -90, max: 90 })
        .withMessage('Select a destination on the map'),
    body('destinationLocation.longitude')
        .isFloat({ min: -180, max: 180 })
        .withMessage('Select a destination on the map'),
    body('vehicleType')
        .isIn(['auto', 'motorcycle', 'car'])
        .withMessage('Select a supported ride type')
], rideController.createRide);

router.get('/', rideController.getRides);
router.get('/nearby', [
    query('latitude').isFloat({ min: -90, max: 90 }).withMessage('Invalid latitude'),
    query('longitude').isFloat({ min: -180, max: 180 }).withMessage('Invalid longitude'),
    query('vehicleType').optional().isIn(['auto', 'motorcycle', 'car']).withMessage('Invalid vehicle type'),
    query('radius').optional().isInt({ min: 100, max: 10000 }).withMessage('Radius must be between 100 and 10000 meters')
], rideController.getNearbyCaptains);
router.get('/:id', [
    param('id').isMongoId().withMessage('Invalid ride ID')
], rideController.getRide);
router.post('/:id/cancel', [
    param('id').isMongoId().withMessage('Invalid ride ID')
], rideController.cancelRide);

module.exports = router;
