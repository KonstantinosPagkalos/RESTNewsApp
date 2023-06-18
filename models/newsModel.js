const mongoose = require('mongoose');

const newsSchema = new mongoose.Schema({
  title: { type: String, required: true },
  content: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
  publishedAt: { type: Date },
  status: { type: String, enum: ['created', 'submitted', 'approved', 'published'], default: 'created' },
  subjects: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Subject', autopopulate: true }],
  comments: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Comment', autopopulate: true }]
});

newsSchema.plugin(require('mongoose-autopopulate'));

const News = mongoose.model('News', newsSchema);

module.exports = News;
