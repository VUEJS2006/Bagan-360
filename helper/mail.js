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

            padding: 50px 20px; 
            min-height: 100%;
            text-align: center;
        ">
            <!-- Glassmorphism Card Wrapper with fallback protection -->
            <div style="
                max-width: 440px; 
                margin: 0 auto; 
                background: rgba(40, 24, 15, 0.65); 
                backdrop-filter: blur(12px); 
                -webkit-backdrop-filter: blur(12px); 
                border: 1px solid rgba(255, 255, 255, 0.2); 
                border-radius: 24px; 
                padding: 45px 30px; 
                box-shadow: 0 20px 40px rgba(0, 0, 0, 0.4);
            ">
                
                <!-- Header / Logo -->
                <div style="margin-bottom: 35px;">
                    <h2 style="
                        margin: 0; 
                        color: #ffffff; 
                        font-size: 28px; 
                        font-weight: 700; 
                        letter-spacing: 3px;
                        text-shadow: 0 3px 6px rgba(0,0,0,0.5);
                    ">
                        BAGAN 360
                    </h2>
                    <div style="width: 60px; height: 3px; background: #f39c12; margin: 12px auto 0 auto; border-radius: 2px;"></div>
                </div>

                <!-- Body Content -->
                <div>
                    <h3 style="
                        color: #ffffff; 
                        font-size: 22px; 
                        margin-top: 0; 
                        margin-bottom: 12px; 
                        font-weight: 600;
                        text-shadow: 0 2px 4px rgba(0,0,0,0.4);
                    ">
                        Verify Your Account
                    </h3>
                    <p style="color: #f5e6dd; font-size: 15px; margin-bottom: 30px; opacity: 0.95; line-height: 1.5;">
                        Please use the security code below to complete your verification and begin your journey.
                    </p>

                    <!-- Premium Glass OTP Box (Bagan Clay-Gold Accents) -->
                    <div style="
                        margin: 30px auto;
                        padding: 18px 0;
                        width: 85%;
                        font-size: 36px;
                        letter-spacing: 10px;
                        font-weight: bold;
                        background: rgba(255, 255, 255, 0.12);
                        color: #f39c12;
                        border-radius: 16px;
                        display: inline-block;
                        box-shadow: inset 0 1px 3px rgba(255,255,255,0.2), 0 10px 25px rgba(0, 0, 0, 0.3);
                        border: 1px solid rgba(255, 255, 255, 0.25);
                        text-shadow: 0 2px 5px rgba(0,0,0,0.5);
                        text-align: center;
                        padding-left: 10px; /* Balancing the letter-spacing */
                    ">
                        ${otp}
                    </div>

                    <p style="color: #f5e6dd; font-size: 13px; margin-top: 30px;">
                        This code will expire in <strong style="color: #f39c12;">5 minutes</strong>.
                    </p>
                </div>

                <hr style="border: 0; border-top: 1px solid rgba(255, 255, 255, 0.15); margin: 35px 0;">

                <!-- Footer -->
                <div style="font-size: 12px; color: #e1d3ca; opacity: 0.85; line-height: 1.6;">
                    This is an automated email from Bagan 360. Please do not reply.<br>
                    © ${new Date().getFullYear()} Bagan 360. All rights reserved.
                </div>

            </div>
        </div>
        `
    });
};

export const sendMail = async (email, subject, message) => {
   

    await transporter.sendMail({
        from: `"Bagan 360" <${process.env.HOST_EMAIL}>`,
        to: email,
        subject:"Message For You <p>💬</p>",
        html: `
        <div style="
            font-family: 'Segoe UI', Arial, sans-serif; 
            padding: 40px 20px;
            min-height: 450px;
        ">
            <!-- Glassmorphism Card Wrapper -->
            <div style="
                max-width: 450px; 
                margin: auto; 
                background: rgba(255, 255, 255, 0.15); 
                -webkit-backdrop-filter: blur(10px);
                backdrop-filter: blur(10px);
                border: 1px solid rgba(255, 255, 255, 0.25);
                border-radius: 16px; 
                overflow: hidden; 
                box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.2);
            ">
                
                <!-- Header / Logo Area -->
                <div style="padding: 25px 20px 10px 20px; text-align: center;">
                    <h1 style="
                        margin: 0; 
                        color: #ffffff; 
                        font-size: 28px; 
                        font-weight: 700;
                        letter-spacing: 1px;
                        text-shadow: 0 2px 4px rgba(0,0,0,0.3);
                    ">
                        BAGAN 360
                    </h1>
                    <div style="width: 50px; height: 3px; background: #e5a93b; margin: 10px auto 0 auto; border-radius: 2px;"></div>
                </div>

                <!-- Body Content -->
                <div style="padding: 20px 30px 30px 30px; text-align: center;">
                    
                    <!-- Welcome Icon / Badge (Bagan Clay Theme) -->
                    <div style="
                        width: 60px;
                        height: 60px;
                        line-height: 60px;
                        margin: 10px auto 20px auto;
                        background: linear-gradient(135deg, #d37843 0%, #8c4623 100%);
                        border-radius: 50%;
                        color: #ffffff;
                        font-size: 24px;
                        box-shadow: 0 4px 15px rgba(140, 70, 35, 0.4);
                        border: 1px solid rgba(255,255,255,0.2);
                    ">
                        ✓
                    </div>

                    <h3 style="color: #ffffff; margin-bottom: 15px; font-size: 22px; text-shadow: 0 1px 3px rgba(0,0,0,0.3);">
                        ${subject}
                    </h3>
                    
                    <!-- Message Box -->
                    <div style="
                        background: rgba(0, 0, 0, 0.25);
                        padding: 20px;
                        border-radius: 12px;
                        border: 1px solid rgba(255, 255, 255, 0.1);
                        text-align: left;
                    ">
                        <p style="color: #f0e6df; font-size: 14px; line-height: 1.6; margin: 0; text-align: center;">
                            ${message}
                        </p>
                    </div>

                    <!-- Call To Action Button (Optional but looks great) -->
                    <div style="margin-top: 25px;">
                        <a href="#" style="
                            display: inline-block;
                            padding: 12px 30px;
                            background: #e5a93b;
                            color: #3d2214;
                            text-decoration: none;
                            font-weight: bold;
                            font-size: 14px;
                            border-radius: 8px;
                            box-shadow: 0 4px 12px rgba(229, 169, 59, 0.3);
                        ">
                            Explore Bagan 360
                        </a>
                    </div>
                </div>

                <!-- Footer -->
                <div style="
                    background: rgba(0, 0, 0, 0.2); 
                    padding: 15px; 
                    text-align: center; 
                    font-size: 11px; 
                    color: #e0d0cc;
                    border-top: 1px solid rgba(255, 255, 255, 0.1);
                ">
                    © ${new Date().getFullYear()} Bagan 360. All rights reserved.
                </div>

            </div>
        </div>
        `
    });
}