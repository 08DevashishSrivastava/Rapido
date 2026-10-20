const test = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const rideModel = require('../models/ride.model');

const validRide = () => new rideModel({
    user: new mongoose.Types.ObjectId(),
    pickup: 'Central station',
    pickupLocation: { latitude: 12.9, longitude: 77.6 },
    destination: 'City park',
    destinationLocation: { latitude: 12.91, longitude: 77.61 },
    vehicleType: 'auto'
});

test('ride requires its owner and both locations', async () => {
    const ride = new rideModel({ vehicleType: 'auto' });
    await assert.rejects(ride.validate(), error => {
        assert.ok(error.errors.user);
        assert.ok(error.errors.pickup);
        assert.ok(error.errors.pickupLocation);
        assert.ok(error.errors.destination);
        assert.ok(error.errors.destinationLocation);
        return true;
    });
});

test('ride only accepts supported vehicle types and real workflow statuses', async () => {
    const unsupportedType = validRide();
    unsupportedType.vehicleType = 'spaceship';
    await assert.rejects(unsupportedType.validate(), error => Boolean(error.errors.vehicleType));

    const unsupportedStatus = validRide();
    unsupportedStatus.status = 'driver_assigned';
    await assert.rejects(unsupportedStatus.validate(), error => Boolean(error.errors.status));
});

test('new ride starts pending and stores the requested route and vehicle type', async () => {
    const ride = validRide();
    await ride.validate();

    assert.equal(ride.status, 'pending');
    assert.equal(ride.pickup, 'Central station');
    assert.equal(ride.destination, 'City park');
    assert.equal(ride.vehicleType, 'auto');
});
