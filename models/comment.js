const mongoose = require('mongoose');
const { Schema } = mongoose;

const commentSchema = new Schema({
  content: { type: String, required: true },
  creationDate: {
    type: Date,
    default: () => {
      const now = new Date();
      const greeceTimezoneOffset = 180; // Greece timezone offset in minutes
      const greeceTimezoneOffsetMilliseconds = greeceTimezoneOffset * 60 * 1000;
      const greeceTime = now.getTime() + greeceTimezoneOffsetMilliseconds;
      return new Date(greeceTime);
    },
  },
  creatorName: { type: String },
  state: {
    type: String,
    enum: ['created', 'approved'],
    default: 'created',
  },
  newsItem: { type: Schema.Types.ObjectId, ref: 'News' } // Add a reference to the News model
});

commentSchema.methods.approve = function() {
  this.state = 'approved';
};

commentSchema.methods.reject = function() {
  this.state = 'rejected';
};

commentSchema.pre('remove', function(next) {
  // Automatically delete the comment when it is rejected
  if (this.state === 'created') {
    next();
  } else {
    const error = new Error('Cannot delete a comment that has been approved or rejected.');
    next(error);
  }
});

const Comment = mongoose.model('Comment', commentSchema);

module.exports = Comment;
