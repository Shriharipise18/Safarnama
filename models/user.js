const {Schema,model}= require('mongoose');
const { createHmac ,randomBytes } = require('node:crypto');
const {createTokenForUser} = require('../services/authentication')

const userSchema = new Schema(
{
    fullName:{
        type:'String',
        required : true
    },
    firstName: {
        type: String,
        get: function() {
            // If firstName is not set, return the first part of fullName
            if (!this._firstName && this.fullName) {
                const nameParts = this.fullName.split(' ');
                return nameParts[0] || '';
            }
            return this._firstName;
        },
        set: function(value) {
            this._firstName = value;
        }
    },
    lastName: {
        type: String,
        get: function() {
            // If lastName is not set, return the rest of fullName
            if (!this._lastName && this.fullName) {
                const nameParts = this.fullName.split(' ');
                return nameParts.slice(1).join(' ') || '';
            }
            return this._lastName;
        },
        set: function(value) {
            this._lastName = value;
        }
    },
    email:{
        type:String,
        required:true,
        unique:true
    },
    salt:{
        type:String,
    }
    ,
    password:{
        type:String,
        requied:true
    },
    profileImageURL:{
        type:String,
        default:'/images/default.png',
    },
    profileImage: {
        type: String,
        get: function() {
            return this.profileImageURL || '/images/default-avatar.png';
        }
    },
    role:{
        type:String,
        enum:["USER","ADMIN"],
        default:"USER",
    },
    followers: [{
        type: Schema.Types.ObjectId,
        ref: 'user'
    }],
    following: [{
        type: Schema.Types.ObjectId,
        ref: 'user'
    }],
    bio: {
        type: String,
        default: ''
    },
    googleId: {
        type: String
    }
},
{timestamps: true}
); 

//using pre middleware of mangoose
userSchema.pre('save',function(next){
    const user = this;
    
    // If password is not modified, just continue
    if(!user.isModified("password")) return next();
    
    // Generate salt and hash password
    const salt = randomBytes(16).toString('hex');
    const hashedPassword = createHmac('sha256', salt)
        .update(user.password)
        .digest("hex");
    
    this.salt = salt;
    this.password = hashedPassword;
    next();
});

//making function
userSchema.static('matchPasswordAndGenerateToken',async function(email,password){
    const user =await this.findOne({email});
    if(!user) throw new Error('User not found !');

    console.log(user);
    const salt = user.salt;
    const hashedPassword = user.password;

    const userProvideHash = createHmac("sha256",salt)
    .update(password)
    .digest("hex")

    if(hashedPassword !== userProvideHash){
        throw new Error("Incorrect Password!");
    }
    const token = createTokenForUser(user)
    return token;
})

const User = model('user',userSchema)

module.exports= User;