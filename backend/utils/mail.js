const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: process.env.MAIL_HOST,
  port: Number(process.env.MAIL_PORT) || 587,
  auth: {
    user: process.env.MAIL_USER,
    pass: process.env.MAIL_PASS,
  },
});

/**
 * Envoie un e-mail.
 * @param {{ to: string, subject: string, html: string }} options
 */
async function sendMail({ to, subject, html }) {
  await transporter.sendMail({
    from: process.env.MAIL_USER,
    to,
    subject,
    html,
  });
}

module.exports = { sendMail };
