const config = require('config');
const jwt = require('jsonwebtoken');
const UsersModel = require('../models/users');
const bcrypt = require('bcryptjs');
const passport = require('passport');

// Jsonwebtoken
module.exports.Token = (id, email, role) => {
    return jwt.sign({
        id: id,
        iss: email, // issuer of the jwt.
        sub: role, // subject of the jwt.
        exp: new Date().setDate(new Date().getDate() + 3), // time after which the jwt expires.
        iat: new Date().getTime() // time at which the jwt was issued, determine age of the jwt.
        // aud: ...
        // nbf: ...
        // jti: ...
    }, config.get('jwt.JWT_SECRET'));
};

module.exports.verifyToken = (token) => {
    return jwt.verify(token, config.get('jwt.JWT_SECRET'));
};

// Users

module.exports.getUsersWithPages = async (currentPage, limitPage, keywords) => {
    const skip = (currentPage - 1) * limitPage;
    const query = UsersModel.find({
        full_name: {
            $regex: keywords
        }
    });

    const docs = await query.skip(skip).limit(limitPage).sort({
        _id: -1
    });
    
    const users = await query.countDocuments();

    return {
        docs: docs,
        currentPage: currentPage,
        totalItems: users,
        limitPage: limitPage
    };
};

module.exports.getUsers = async () => {
    const users = await UsersModel.find();
    return users;
};

module.exports.register = async (userInfo) => {
    try {
        const salt = await bcrypt.genSalt(10);
        userInfo.password = await bcrypt.hash(userInfo.password, salt);
        const newUser = new UsersModel(userInfo);
        await newUser.save();
    } catch (error) {
        throw error;
    };
};

module.exports.getMyInfo = async (id) => {
    const myInfo = await UsersModel.findById(id);
    return myInfo;
};

module.exports.login = async (email, password) => {
    const user = await UsersModel.findOne({
        email: email
    });
    const match = await bcrypt.compare(password, user.password);
    if (user && match == true) {
        return {
            userInfo: user,
            token: this.Token(user._id, user.email, user.role)
        };
    };
};

module.exports.findUserByEmail = async (email) => {
    const user = await UsersModel.findOne({
        email: email
    });
    return user;
};

module.exports.resetPassword = async (email, updatePassword) => {
    try {
        const salt = await bcrypt.genSalt(10);
        updatePassword = await bcrypt.hash(updatePassword, salt);
        await UsersModel.updateOne({
            email: email
        }, {
            password: updatePassword
        });
    } catch (err) {
        throw err;
    };
};

// Passport
module.exports.findUserByGoogleId = async (id) => {
    const user = await UsersModel.findOne({
        googleId: id
    });
    return user;
};

passport.serializeUser((user, done) => {
    done(null, user);
});

passport.deserializeUser((id, done) => {
    UsersModel.findById(id).then((user) => {
        done(null, user);
    });
});