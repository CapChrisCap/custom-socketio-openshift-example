'use strict';

const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const BBPromise = require('bluebird');
mongoose.Promise = BBPromise;
const ValidatorError = mongoose.Error.ValidatorError;
const ValidationError = mongoose.Error.ValidationError;

const ChatSchema = new Schema({

    starterUserId: {
        type: String,
        required: true
    },

    _lastMessage: {
        type: Schema.Types.ObjectId,
        ref: 'ChatMessage',
        required: false
    },

    numMessages: {
        type: Number,
        default: 0
    },

    lastUpdate: {
        type: Number,
        required: true
    },

    partners: [String], // list of user ids

});

const ChatMessageSchema = new Schema({

    message: {
        type: String,
        required: true
    },

    authorUserId: {
        type: String,
        required: true
    },

    _chat: {
        type: Schema.Types.ObjectId,
        ref: 'Chat',
        index: true,
        required: true
    },

    createdAt: {
        type: Number,
        required: true
    }

});

ChatSchema.statics.create = function create(starterUserId, partners) {
    return new BBPromise(function (resolve, reject) {
        const chat = new Chat({
            starterUserId: starterUserId,
            numMessages: 0,
            partners: partners
        });

        chat.save(function (err) {
            if (err) {
                reject(err);
            } else {
                resolve(chat);
            }
        });
    })
};

ChatSchema.statics.createMessage = function createMessage(chatId, userId, message) {
    const Chat = this.model('Chat');
    const ChatMessage = this.model('ChatMessage');

    return new BBPromise(function (resolve, reject) {
         // first get correct chat and check if user is allowed to post
         Chat.findOne({
             _id: chatId,
             $or: [{
                 starterUserId: userId
             }, {
                 partners: userId
             }]
         }, function (err, chat) {
             if (err) {
                 reject(err);
             } else if (!chat) {
                 reject('Chat does not exist or user has to the permission to create a new chat message');
             } else {
                 chat.numMessages++;
                 chat.save(function (err) {
                     if (err) {
                         reject(err);
                     } else {
                         const chatMessage = new ChatMessage({
                             message: message.trim(),
                             authorUserId: userId,
                             _chat: chat._id,
                             createdAt: new Date().getTime()
                         });
                         chatMessage.save(function (err) {
                             if (err) {
                                 reject(err);
                             } else {
                                 resolve(chatMessage);
                             }
                         });
                     }
                 });
             }
        });
    });
};

ChatMessage: mongoose.model('ChatMessage', ChatMessageSchema);
module.exports = mongoose.model('Chat', ChatSchema);
