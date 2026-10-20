const test = require('node:test');
const assert = require('node:assert/strict');
const captainModel = require('../models/captain.model');
const captainController = require('../controllers/captain.controller');
const rideController = require('../controllers/ride.controller');

function responseRecorder() {
    return {
        statusCode: 200,
        body: null,
        status(code) {
            this.statusCode = code;
            return this;
        },
        json(body) {
            this.body = body;
            return this;
        }
    };
}

test('captain model has a geospatial index for nearby location searches', () => {
    const hasLocationIndex = captainModel.schema.indexes().some(([fields]) => {
        return fields.location === '2dsphere';
    });
    assert.equal(hasLocationIndex, true);
});

test('captain GPS update stores validated coordinates and opts into active status', async () => {
    let saved = false;
    const captain = {
        async save() {
            saved = true;
        }
    };
    const res = responseRecorder();

    await captainController.updateLocation({
        body: { latitude: '12.9', longitude: '77.6' },
        captain
    }, res);

    assert.equal(saved, true);
    assert.equal(captain.latitude, 12.9);
    assert.equal(captain.longitude, 77.6);
    assert.deepEqual(captain.location, {
        type: 'Point',
        coordinates: [77.6, 12.9]
    });
    assert.equal(captain.status, 'active');
    assert.ok(captain.locationUpdatedAt instanceof Date);
    assert.equal(res.statusCode, 200);
});

test('nearby vehicle query is radius-limited and returns no captain identity fields', async t => {
    const originalFind = captainModel.find;
    let query;
    captainModel.find = filter => {
        query = filter;
        return {
            select(fields) {
                assert.equal(fields, 'vehicle.color vehicle.vehicleType location locationUpdatedAt');
                return this;
            },
            limit(value) {
                assert.equal(value, 50);
                return this;
            },
            async lean() {
                return [{
                    _id: 'captain-id',
                    email: 'private@example.com',
                    fullname: { firstname: 'Private' },
                    vehicle: { color: 'Blue', vehicleType: 'auto', plate: 'PRIVATE' },
                    location: { coordinates: [77.6, 12.9] },
                    locationUpdatedAt: new Date()
                }];
            }
        };
    };
    t.after(() => {
        captainModel.find = originalFind;
    });

    const res = responseRecorder();
    await rideController.getNearbyCaptains({
        query: { latitude: '12.9', longitude: '77.6', vehicleType: 'auto', radius: '10000' }
    }, res);

    assert.equal(query.status, 'active');
    assert.equal(query['vehicle.vehicleType'], 'auto');
    assert.deepEqual(query.location.$near.$geometry.coordinates, [77.6, 12.9]);
    assert.equal(query.location.$near.$maxDistance, 10000);
    assert.ok(query.locationUpdatedAt.$gte instanceof Date);
    assert.equal(res.body.vehicles.length, 1);
    assert.deepEqual(res.body.vehicles[0], {
        color: 'Blue',
        vehicleType: 'auto',
        latitude: 12.9,
        longitude: 77.6,
        updatedAt: res.body.vehicles[0].updatedAt
    });
    assert.equal(res.body.vehicles[0].email, undefined);
    assert.equal(res.body.vehicles[0].plate, undefined);
});
