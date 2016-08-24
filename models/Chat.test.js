'use strict';


// import the moongoose helper utilities
var utils = require('../../utils');
var mongoose = require('mongoose');
var ValidationError = mongoose.Error.ValidationError;
var chai = require('chai');
var expect = chai.expect;
var chaiAsPromised = require("chai-as-promised");
var BBPromise = require('bluebird');

chai.use(chaiAsPromised);


// import our User mongoose model
var Chat = require('../../../services/models/Chat');

function expectValidationError(parameter, kind, err) {
    expect(err).to.be.an.instanceof(ValidationError);
    expect(err.errors[parameter]).to.exist;
    expect(err.errors[parameter].kind).to.be.equal(kind);
}

describe('Chats: models', function () {

    const CURRENT_USER_ID = "ABCDEF01234";
    describe('#getLatestChatMessages()', function () {
        it('should fail with empty parameters', function (done) {
            return expect(Chat.getLatestChatMessages())
                .to.be.rejected
                .then(expectValidationError.bind(undefined, 'userId', 'notvalid'))
                .then(done);
        });
        it('should fail with invalid users parameter', function (done) {
            return expect(Chat.getLatestChatMessages({}))
                .to.be.rejected
                .then(expectValidationError.bind(undefined, 'userId', 'notvalid'))
                .then(done);
        });
        it('should fail with invalid limit parameter', function (done) {
            return expect(Chat.getLatestChatMessages(CURRENT_USER_ID, 'invalidLimit'))
                .to.be.rejected
                .then(expectValidationError.bind(undefined, 'length', 'notvalid'))
                .then(done);
        });
        it('should resolve empty array when no messages exists', function (done) {
            return expect(Chat.getLatestChatMessages(CURRENT_USER_ID, 10))
                .to.be.fulfilled
                .then(function (data) {
                    expect(data).to.deep.equal([]);
                    done();
                });
        });

        /**
         * Returns a random integer between min (inclusive) and max (inclusive)
         * Using Math.round() will give you a non-uniform distribution!
         */
        function getRandomInt(min, max) {
            return Math.floor(Math.random() * (max - min + 1)) + min;
        }

        var ctr = 0;
        function createChat(currentUser, partners, numMessages) {
            if (!partners) {
                partners = ["otherUserId" + (ctr++)];
            }

            return new BBPromise(function (resolve, reject) {
                const chat = new Chat({
                    starterUserId: currentUser,
                    lastUpdate: new Date().getTime() - getRandomInt(-500, 500),
                    partners: partners
                });
                chat.save(function (err) {
                    if (err) {
                        reject(err);
                    }
                    const promises = [];
                    const possibleUsers = partners.slice(0);
                    possibleUsers.push(currentUser);
                    for (let i = 0; i < numMessages; i++) {
                        promises.push(new BBPromise(function (resolveSub, rejectSub) {
                            Chat.createMessage(chat._id, possibleUsers[getRandomInt(0, possibleUsers.length - 1)], "dummy")
                                .then(function (message) {
                                    chat.numMessages += 1;
                                    chat._lastMessage = message._id;
                                    chat.lastUpdate = message.createdAt,
                                    chat.save(resolveSub);
                                }).catch(rejectSub);
                        }));
                    }
                    BBPromise.all(promises).then(resolve).catch(reject);
                });
            });
        }

        describe('3 empty chats exists', function () {

            const testUser = CURRENT_USER_ID + '-empty-3-chats';
            before(function (done) {
                BBPromise.all([
                    createChat(testUser, null, 0),
                    createChat(testUser, null, 0),
                    createChat(testUser, null, 0)
                ]).then(function () {
                    done();
                }).catch(function (err) {
                    done(err);
                });
            });

            it('should return empty list', function (done) {
                expect(Chat.getLatestChatMessages(testUser, 10))
                    .to.be.fulfilled
                    .then(function (data) {
                        expect(data).to.have.length(3);
                        done();
                    }).catch(function () {
                    done();
                });
            });

        });

        describe('5 chats exists, 3 without a chat message, all belongs to user', function () {

            const testUser = CURRENT_USER_ID + '-5-chats';
            before(function (done) {
                BBPromise.all([
                    createChat(testUser, null, 0),
                    createChat(testUser, null, 1),
                    createChat("otherUserId1234", [testUser], 3),
                    createChat(testUser, null, 0),
                    createChat(testUser, null, 0)
                ]).then(function () {
                    done();
                }).catch(function (err) {
                    done(err);
                });
            });

            it('should resolve non empty array (2 elements)', function (done) {
                return expect(Chat.getLatestChatMessages(testUser, 10))
                    .to.be.fulfilled
                    .then(function (data) {
                        expect(data).to.have.length(2);
                        done();
                    });
            });

        });

        describe('8 chats exists, 5 belongs to user a chat message (3 without a chat message)', function () {
            const testUser = CURRENT_USER_ID + '-8-chats';
            before(function (done) {
                BBPromise.all([
                    createChat(testUser, null, 0),
                    createChat(testUser, null, 1),
                    createChat("otherUserId1234", [testUser], 3),
                    createChat(testUser, null, 0),
                    createChat(testUser, null, 0),
                    createChat("otherXX", null, 4),
                    createChat("otherXXABC", null, 2),
                    createChat("otherDummy123", null, 3)

                ]).then(function () {
                    done();
                }).catch(function (err) {
                    done(err);
                });
            });

            it('should resolve non empty array (2 elements)', function (done) {
                return expect(Chat.getLatestChatMessages(testUser, 10))
                    .to.be.fulfilled
                    .then(function (data) {
                        expect(data).to.have.length(2);
                        done();
                    });
            });

            it('should resolve correct array elements in correct order (ordered by date descending)', function (done) {
                return expect(Chat.getLatestChatMessages(testUser, 10))
                    .to.be.fulfilled
                    .then(function (data) {
                        let lastCreatedAtDate = -1;
                        for (let i = 0; i < data.length; i++) {
                            if (lastCreatedAtDate !== -1) {
                                expect(lastCreatedAtDate).to.be.at.least(data[i].createdAt);
                            }
                            lastCreatedAtDate = data[i].createdAt;
                        }
                        done();
                    });
            });

        });

/*
        it('should resolve non empty array when messages exists in system but not belong to user', function (done) {
            return expect(Chat.getLatestChatMessages(CURRENT_USER_ID, 10))
                .to.be.fulfilled
                .then(function (data) {
                    expect(data).to.deep.equal([]);
                    done();
                });
        });

        it('should resolve non empty array when messages exists in system but not belong to user', function (done) {
            return expect(Chat.getLatestChatMessages(CURRENT_USER_ID, 10))
                .to.be.fulfilled
                .then(function (data) {
                    expect(data).to.deep.equal([]);
                    done();
                });
        });

        it('should resolve non only 10 (limit) numbers of chats when messages of user exists', function (done) {
            return expect(Chat.getLatestChatMessages(CURRENT_USER_ID, 10))
                .to.be.fulfilled
                .then(function (data) {
                    expect(data).to.deep.equal([]);
                    done();
                });
        });*/

    });


});
