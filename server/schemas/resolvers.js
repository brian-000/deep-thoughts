const { User, Thought } = require('../models');
const { AuthenticationError } = require('apollo-server-express');
const { signToken } = require('../utils/auth');

const resolvers = {
  Query: {
    me: async (parent, args, context) => {
      if (context.user) {
        const userData = await User.findOne({ _id: context.user._id })
          .select('-__v -password')
          .populate('thoughts')
          .populate('friends');
    
        return userData;
      }
    
      throw new AuthenticationError('Not logged in');
    }
    ,

    thoughts: async (parent, { username }) => {
      const params = username ? { username } : {};
      return Thought.find(params).sort({ createdAt: -1 });
    },

    // place this inside of the `Query` nested object right after `thoughts`
    thought: async (parent, { _id }) => {
      return Thought.findOne({ _id });
    },
    // get all users
    users: async () => {
      return User.find()
        .select('-__v -password')
        .populate('friends')
        .populate('thoughts');
    },
    // get a user by username
    user: async (parent, { username }) => {
      return User.findOne({ username })
        .select('-__v -password')
        .populate('friends')
        .populate('thoughts');
    },
  },

  Mutation: {
    addUser: async (parent, args) => {
      const user = await User.create(args);
      const token = signToken(user);

      return { token, user };
    },
    login: async (parent, { email, password }) => {
      const user = await User.findOne({ email });

      if (!user) {
        throw new AuthenticationError('Incorrect credentials');
      }

      const correctPw = await user.isCorrectPassword(password);

      if (!correctPw) {
        throw new AuthenticationError('Incorrect credentials');
      }

      const token = signToken(user);
      return { token, user };
    }
  },
  addThought: async (parent, args, context) => {
    if (context.user) {
      const thought = await Thought.create({ ...args, username: context.user.username });
  
      await User.findByIdAndUpdate(
        { _id: context.user._id },
        { $push: { thoughts: thought._id } },
        { new: true }
      );
  
      return thought;
    }
  
    throw new AuthenticationError('You need to be logged in!');
  },
  addReaction: async (parent, { thoughtId, reactionBody }, context) => {
    if (context.user) {
      const updatedThought = await Thought.findOneAndUpdate(
        { _id: thoughtId },
        { $push: { reactions: { reactionBody, username: context.user.username } } },
        { new: true, runValidators: true }
      );
  
      return updatedThought;
    }
  
    throw new AuthenticationError('You need to be logged in!');
  },
  addFriend: async (parent, { friendId }, context) => {
    if (context.user) {
      const updatedUser = await User.findOneAndUpdate(
        { _id: context.user._id },
        { $addToSet: { friends: friendId } },
        { new: true }
      ).populate('friends');
  
      return updatedUser;
    }
  
    throw new AuthenticationError('You need to be logged in!');
  }
};
module.exports = resolvers;

/*
Queries: Queries are how we perform GET requests and ask for data from a GraphQL API.

Mutations: Mutations are how we perform POST, PUT, and DELETE requests to create or manipulate data through a GraphQL API.


Type definitions: Type definitions, or TypeDefs for short, involves literally defining every piece of data that the client can expect to work with through a query or mutation. Every GraphQL API starts with defining this data, as this type of strict type definition will give the client more clarity as to what they are asking for and what they can expect in return. Think of this as not only defining the API endpoint, but also defining the exact data and parameters that are tied to that endpoint.

Resolvers: Resolvers are simply the functions we connect to each query or mutation type definition that perform the CRUD actions that each query or mutation is expected to perform.
*/