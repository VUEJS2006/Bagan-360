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
        subject: "Your OTP Code - Bagan 360",
        html: `
        <div style="
            font-family: 'Segoe UI', Arial, sans-serif; 
            background: linear-gradient(135deg, #e67e22 0%, #a04000 50%, #5a3825 100%); 
            padding: 40px 20px; 
            min-height: 100%;
            text-align: center;
        ">
           
            <div style="
                max-width: 450px; 
                margin: 0 auto; 
                background: rgba(255, 255, 255, 0.12); 
                backdrop-filter: blur(12px); 
                -webkit-backdrop-filter: blur(12px); 
                border: 1px solid rgba(255, 255, 255, 0.25); 
                border-radius: 20px; 
                padding: 40px 30px; 
                box-shadow: 0 15px 35px rgba(0, 0, 0, 0.2);
            ">
                
               
                <div style="margin-bottom: 30px;">
                    <h2 style="
                        margin: 0; 
                        color: #ffffff; 
                        font-size: 28px; 
                        font-weight: 700; 
                        letter-spacing: 2px;
                        text-shadow: 0 2px 4px rgba(0,0,0,0.2);
                    ">
                        BAGAN 360
                    </h2>
                    <div style="width: 50px; height: 3px; background: #f39c12; margin: 12px auto 0 auto; border-radius: 2px;"></div>
                </div>

                <!-- Body Content -->
                <div>
                    <h3 style="color: #ffffff; font-size: 22px; margin-top: 0; margin-bottom: 10px; font-weight: 600;">
                        Verify Your Account
                    </h3>
                    <p style="color: #f5f5f5; font-size: 15px; margin-bottom: 30px; opacity: 0.9;">
                        Please use the security code below to complete your verification.
                    </p>

                   
                    <div style="
                        margin: 25px auto;
                        padding: 18px;
                        font-size: 32px;
                        letter-spacing: 8px;
                        font-weight: bold;
                        background: rgba(255, 255, 255, 0.9);
                        color: #5a3825;
                        border-radius: 12px;
                        display: inline-block;
                        box-shadow: 0 8px 20px rgba(0, 0, 0, 0.15);
                        border-left: 5px solid #f39c12;
                        padding-left: 26px; /* balancing the letter-spacing */
                    ">
                        ${otp}
                    </div>

                    <p style="color: #eaeaea; font-size: 13px; margin-top: 25px; font-style: italic;">
                         This code will expire in <strong style="color: #f1c40f;">5 minutes</strong>.
                    </p>
                </div>

                <hr style="border: 0; border-top: 1px solid rgba(255, 255, 255, 0.15); margin: 30px 0;">

              
                <div style="font-size: 12px; color: #dfdfdf; opacity: 0.8; line-height: 1.6;">
                    This is an automated email from Bagan 360. Please do not reply.<br>
                    © ${new Date().getFullYear()} Bagan 360. All rights reserved.
                </div>

            </div>
        </div>
        `
    });
}

export const sendMail = async (email, subject, message) => {
    await transporter.sendMail({
        from: `"Bagan 360" <${process.env.HOST_EMAIL}>`,
        to: email,
        subject,
        html: `
        <div style="font-family: Arial, sans-serif; background:#f5f1eb; padding:20px;">
            <div style="max-width:420px; margin:auto; background:#ffffff; border-radius:10px; text-align:center; box-shadow:0 4px 10px rgba(0,0,0,0.1); overflow:hidden;">
                
                <div style="background:#5a3825; color:white; padding:15px;">
                    <h3 style="margin:0;">Bagan 360</h3>
                </div>

                <div style="padding:30px;">
                    <h4 style="color:#5a3825;">${subject}</h4>
                    <p style="color:#555; font-size:14px;">
                        ${message}
                    </p>
                </div>

            </div>
        </div>
        `
    });
}