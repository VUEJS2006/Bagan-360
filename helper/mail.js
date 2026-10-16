import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: process.env.HOST_EMAIL,
        pass: process.env.HOST_PASSWORD
    }
});

export const sentOTP = async (email, otp) => {
    await transporter.sendMail({
        from: `"Bagan 360" <${process.env.HOST_EMAIL}>`,
        to: email,
        subject: "Your Account Verification OTP - Bagan 360",
        html: `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>OTP Verification</title>
        </head>
        <body style="margin: 0; padding: 0; background-color: #1a0f0a; font-family: 'Segoe UI', Arial, sans-serif;">
            <table width="100%" cellpadding="0" cellspacing="0" style="background: linear-gradient(135deg, #79300C 0%, #2c1104 100%); padding: 50px 20px;">
                <tr>
                    <td align="center">
                        <!-- Glassmorphism Card Wrapper -->
                        <table width="440" cellpadding="0" cellspacing="0" style="background: rgba(121, 48, 12, 0.45); backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px); border: 1px solid rgba(197, 127, 32, 0.3); border-radius: 24px; box-shadow: 0 20px 40px rgba(0, 0, 0, 0.5); overflow: hidden;">
                            <tr>
                                <td style="padding: 45px 30px; text-align: center;">
                                    
                                    <!-- Header / Logo Area -->
                                    <div style="margin-bottom: 30px;">
                                        <h2 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700; letter-spacing: 3px; text-shadow: 0 3px 6px rgba(0,0,0,0.5);">
                                            BAGAN 360
                                        </h2>
                                        <div style="width: 60px; height: 3px; background: #C57F20; margin: 12px auto 0 auto; border-radius: 2px;"></div>
                                    </div>

                                    <!-- Body Content -->
                                    <div>
                                        <h3 style="color: #ffffff; font-size: 22px; margin-top: 0; margin-bottom: 12px; font-weight: 600; text-shadow: 0 2px 4px rgba(0,0,0,0.4);">
                                            Verify Your Account
                                        </h3>
                                        <p style="color: #f5e6dd; font-size: 15px; margin-bottom: 30px; opacity: 0.95; line-height: 1.5;">
                                            Please use the security code below to complete your verification and begin your ancient journey.
                                        </p>

                                        <!-- Premium Glass OTP Box -->
                                        <div style="margin: 20px auto; padding: 18px 0; width: 85%; background: rgba(255, 255, 255, 0.1); border-radius: 16px; border: 1px solid rgba(197, 127, 32, 0.4); box-shadow: inset 0 1px 3px rgba(255,255,255,0.2), 0 10px 25px rgba(0, 0, 0, 0.3); text-align: center;">
                                            <span style="font-size: 36px; font-weight: bold; color: #C57F20; letter-spacing: 10px; text-shadow: 0 2px 5px rgba(0,0,0,0.5); padding-left: 10px;">
                                                ${otp}
                                            </span>
                                        </div>

                                        <p style="color: #f5e6dd; font-size: 13px; margin-top: 30px;">
                                            This code will expire in <strong style="color: #C57F20;">5 minutes</strong>.
                                        </p>
                                    </div>

                                    <hr style="border: 0; border-top: 1px solid rgba(197, 127, 32, 0.2); margin: 35px 0;">

                                    <!-- Footer -->
                                    <div style="font-size: 12px; color: #e1d3ca; opacity: 0.85; line-height: 1.6;">
                                        This is an automated email from Bagan 360. Please do not reply.<br>
                                        &copy; ${new Date().getFullYear()} Bagan 360. All rights reserved.
                                    </div>

                                </td>
                            </tr>
                        </table>
                    </td>
                </tr>
            </table>
        </body>
        </html>
        `
    });
};

export const sendMail = async (email, subject, message) => {
    await transporter.sendMail({
        from: `"Bagan 360" <${process.env.HOST_EMAIL}>`,
        to: email,
        subject: "Message For You...",
        html: `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Message</title>
        </head>
        <body style="margin: 0; padding: 0; background-color: #1a0f0a; font-family: 'Segoe UI', Arial, sans-serif;">
            <table width="100%" cellpadding="0" cellspacing="0" style="background: linear-gradient(135deg, #79300C 0%, #2c1104 100%); padding: 40px 20px;">
                <tr>
                    <td align="center">
                        <!-- Glassmorphism Card Wrapper -->
                        <table width="450" cellpadding="0" cellspacing="0" style="background: rgba(121, 48, 12, 0.4); backdrop-filter: blur(10px); -webkit-backdrop-filter: blur(10px); border: 1px solid rgba(197, 127, 32, 0.3); border-radius: 16px; overflow: hidden; box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.3);">
                            <tr>
                                <td style="padding: 30px;">
                                    
                                    <!-- Header / Logo Area -->
                                    <div style="text-align: center; margin-bottom: 20px;">
                                        <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700; letter-spacing: 1px; text-shadow: 0 2px 4px rgba(0,0,0,0.3);">
                                            BAGAN 360
                                        </h1>
                                        <div style="width: 50px; height: 3px; background: #C57F20; margin: 10px auto 0 auto; border-radius: 2px;"></div>
                                    </div>

                                    <!-- Welcome Icon / Badge -->
                                    <div style="text-align: center; margin-bottom: 20px;">
                                        <div style="width: 60px; height: 60px; line-height: 60px; margin: 0 auto; background: linear-gradient(135deg, #C57F20 0%, #79300C 100%); border-radius: 50%; color: #ffffff; font-size: 24px; box-shadow: 0 4px 15px rgba(197, 127, 32, 0.4); border: 1px solid rgba(255,255,255,0.2);">
                                            ✓
                                        </div>
                                    </div>

                                    <h3 style="color: #ffffff; margin-bottom: 15px; font-size: 20px; text-align: center; text-shadow: 0 1px 3px rgba(0,0,0,0.3);">
                                        ${subject}
                                    </h3>
                                    
                                    <!-- Message Box -->
                                    <div style="background: rgba(0, 0, 0, 0.3); padding: 20px; border-radius: 12px; border: 1px solid rgba(255, 255, 255, 0.1); margin-bottom: 25px;">
                                        <p style="color: #f0e6df; font-size: 14px; line-height: 1.6; margin: 0; text-align: center;">
                                            ${message}
                                        </p>
                                    </div>

                                    <!-- Call To Action Button -->
                                    <div style="text-align: center; margin-bottom: 10px;">
                                        <a href="#" style="display: inline-block; padding: 12px 30px; background: #C57F20; color: #ffffff; text-decoration: none; font-weight: bold; font-size: 14px; border-radius: 8px; box-shadow: 0 4px 12px rgba(197, 127, 32, 0.3);">
                                            Explore Bagan 360
                                        </a>
                                    </div>

                                </td>
                            </tr>
                            <!-- Footer -->
                            <tr>
                                <td style="background: rgba(0, 0, 0, 0.25); padding: 15px; text-align: center; font-size: 11px; color: #e0d0cc; border-top: 1px solid rgba(255, 255, 255, 0.1);">
                                    &copy; ${new Date().getFullYear()} Bagan 360. All rights reserved.
                                </td>
                            </tr>
                        </table>
                    </td>
                </tr>
            </table>
        </body>
        </html>
        `
    });
};