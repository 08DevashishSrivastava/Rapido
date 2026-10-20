const test = require('node:test');
const assert = require('node:assert/strict');
const userModel = require('../models/user.model');
const captainModel = require('../models/captain.model');

test('rider and captain profiles may omit an optional last name', async () => {
    const user = new userModel({
        fullname: { firstname: 'Alex' },
        email: 'alex@example.com',
        password: 'hashed-password'
    });
    const captain = new captainModel({
        fullname: { firstname: 'Alex' },
        email: 'captain@example.com',
        password: 'hashed-password',
        vehicle: {
            color: 'Blue',
            plate: 'ABC123',
            capacity: 1,
            vehicleType: 'auto'
        }
    });

    await user.validate();
    await captain.validate();
});
