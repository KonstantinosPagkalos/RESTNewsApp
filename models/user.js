const mongoose = require('mongoose');

const userSchema = mongoose.Schema({
    _id: mongoose.Schema.Types.ObjectId,
    username:{
        type: String, 
        required: true,
        unique: true
    },
    password:{
        type: String, 
        required: true
    },
    firstName:{
        type: String,
        required: true
    },
    lastName:{
        type: String,
        required: true
    },
    role:{
        type: String,
        enum: ['admin', 'visitor', 'reporter'],
        required: true
    }
});

const User = mongoose.model('User', userSchema);

module.exports = User;
