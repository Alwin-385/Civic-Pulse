import nodemailer from "nodemailer";

let transporter: nodemailer.Transporter | null = null;
let defaultFrom = process.env.SMTP_USER || "test@civicissue.local";

async function getTransporter() {
  if (transporter) return transporter;

  if (process.env.SMTP_HOST && process.env.SMTP_USER) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT ?? 587),
      secure: false, // true for 465, false for other ports
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  } else {
    // Generate an Ethereal Account for testing
    console.log("[Ethereal] No SMTP defined. Generating test account...");
    const testAccount = await nodemailer.createTestAccount();
    transporter = nodemailer.createTransport({
      host: "smtp.ethereal.email",
      port: 587,
      secure: false,
      auth: {
        user: testAccount.user,
        pass: testAccount.pass,
      },
    });
    defaultFrom = testAccount.user;
    console.log("[Ethereal] Ready! Emails will preview locally.");
  }
  return transporter;
}

export async function sendEmail(params: { to: string; subject: string; text: string }) {
  try {
    const t = await getTransporter();
    const info = await t.sendMail({
      from: `"Civic Connect" <${defaultFrom}>`,
      to: params.to,
      subject: params.subject,
      text: params.text,
    });
    console.log(`\n\n=== NEW MAIL DELIVERY ===`);
    console.log(`[Sent to] ${params.to}`);
    console.log(`[Subject] ${params.subject}`);
    // Only Ethereal gives preview URLs
    if (info.messageId && nodemailer.getTestMessageUrl(info)) {
      console.log(`[Preview URL] ${nodemailer.getTestMessageUrl(info)}`);
    } else {
      console.log(`[Content] ${params.text}`);
    }
    console.log(`=========================\n\n`);
  } catch (err: any) {
    console.log(`[Mail Error] Failed to send email: ${err.message}`);
    // Do not throw so the backend does not crash.
  }
}
