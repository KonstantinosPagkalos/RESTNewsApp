const mongoose = require('mongoose');

const subjectSchema = new mongoose.Schema({
  _id: { type: mongoose.Schema.Types.ObjectId, auto: true },
  name: { type: String, required: true },
  maidenName: { type: String },
  children: [{ type: String }],
  status: {
    type: String,
    enum: ['created', 'approved'],
    default: 'created'
  },
  createdAt: { type: Date, default: Date.now },
  approvedAt: { type: Date }
});

const Subject = mongoose.model('Subject', subjectSchema);

module.exports = Subject;
