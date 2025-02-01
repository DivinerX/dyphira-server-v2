import nodemailer, { Transporter } from 'nodemailer';
import '@/config/dotenv';
import type Mail from 'nodemailer/lib/mailer';
import env from '@/config/env';

const transporter: Transporter = nodemailer.createTransport({
  service: env.SMTP_SERVICE,
  auth: {
    user: env.EMAIL_USER,
    pass: env.EMAIL_PASSWORD,
  },
});

const sendMail = async (mailOptions: Mail.Options): Promise<void> => {
  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('Email sent: ' + info.response);
  } catch (error) {
    console.error(error);
    throw new Error('Failed to send email');
  }
};

export const sendEmail = async (
  email: string,
  subject: string,
  html: string,
): Promise<void> => {
  const mailOptions = {
    from: env.EMAIL_USER,
    to: email,
    subject,
    html,
  };

  await sendMail(mailOptions);
};

export const sendVerificationEmail = async (
  email: string,
  token: string,
): Promise<void> => {
  const verificationLink = `${process.env.BASE_URL}/api/v1/auth/verify-email?token=${token}`;

  const mailOptions = {
    from: env.EMAIL_USER,
    to: email,
    subject: 'Email Verification',
    html: `
      <p>Please verify your email by clicking on the following link:</p>
      <a href="${verificationLink}">
        ${verificationLink}
      </a>
    `,
  };

  await sendMail(mailOptions);
};

export const sendResetPasswordEmail = async (
  email: string,
  token: string,
): Promise<void> => {
  const resetLink = `${env.CLIENT_BASE_URL}/reset-password?token=${token}`;

  const mailOptions = {
    from: env.EMAIL_USER,
    to: email,
    subject: 'Password Reset',
    html: `
      <p>Please reset your password by clicking on the following link:</p>
      <a href="${resetLink}">
        ${resetLink}
      </a>
    `,
  };

  await sendMail(mailOptions);
};
