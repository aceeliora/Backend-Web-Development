'use strict';

const { Worker } = require('bullmq');
const { connection } = require('./queue');
const { transporter } = require('./email');

const worker = new Worker('email', async (job) => {
  if (job.name !== 'otp') {
    throw new Error(`Unsupported email job: ${job.name}`);
  }

  const { to, otp } = job.data || {};
  if (!to || !otp) {
    throw new Error('OTP email job requires both a recipient and an OTP');
  }

  return transporter.sendMail({
    to,
    subject: 'Your email verification code',
    text: `Your verification code is ${otp}. It expires in 10 minutes.`,
  });
}, { connection });

worker.on('completed', (job) => {
  console.log(`Email job ${job.id} completed`);
});

worker.on('failed', (job, error) => {
  console.error(`Email job ${job?.id ?? 'unknown'} failed: ${error.message}`);
});

module.exports = { worker };
