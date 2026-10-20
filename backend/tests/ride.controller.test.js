const test = require('node:test');
const assert = require('node:assert/strict');
const rideModel = require('../models/ride.model');
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

test('cancelling a ride scopes the update to its owner', async t => {
    const originalFindOne = rideModel.findOne;
    let saved = false;
    rideModel.findOne = async filter => {
        assert.deepEqual(filter, {
            _id: '507f1f77bcf86cd799439011',
            user: 'owner-id'
        });
        return {
            status: 'pending',
            async save() {
                saved = true;
                this.status = 'cancelled';
            }
        };
    };
    t.after(() => {
        rideModel.findOne = originalFindOne;
    });

    const res = responseRecorder();
    await rideController.cancelRide({
        params: { id: '507f1f77bcf86cd799439011' },
        user: { _id: 'owner-id' }
    }, res);

    assert.equal(saved, true);
    assert.equal(res.statusCode, 200);
    assert.equal(res.body.ride.status, 'cancelled');
});

test('cancellation rejects rides outside the pending state', async t => {
    const originalFindOne = rideModel.findOne;
    let saved = false;
    rideModel.findOne = async () => ({
        status: 'cancelled',
        async save() {
            saved = true;
        }
    });
    t.after(() => {
        rideModel.findOne = originalFindOne;
    });

    const res = responseRecorder();
    await rideController.cancelRide({
        params: { id: '507f1f77bcf86cd799439011' },
        user: { _id: 'owner-id' }
    }, res);

    assert.equal(saved, false);
    assert.equal(res.statusCode, 409);
    assert.equal(res.body.message, 'Only pending rides can be cancelled');
});
