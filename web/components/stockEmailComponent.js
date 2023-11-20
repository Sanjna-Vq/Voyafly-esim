import nodemailer from "nodemailer";

export async function sendMailToClientWithRetry(stock, retryCount = 5) {
  let attempt = 1;
  while (attempt <= retryCount) {
    try {
      await sendMailToClient(stock);
      console.log(`Email sent successfully on attempt ${attempt}`);
      return;
    } catch (error) {
      console.error(`Error sending email on attempt ${attempt}:`);
      attempt++;

      if (attempt <= retryCount) {
        await new Promise((resolve) => setTimeout(resolve, 5000));
      }
    }
  }
}

async function sendMailToClient(stock) {
  try {
    const transporter = nodemailer.createTransport({
      host: "smtpout.secureserver.net",
      port: 587,
      secure: false,
      auth: {
        user: "hello@voyafly.com",
        pass: "voyafly1987",
      },
    });
    const mailOptions = {
      from: "hello@voyafly.com",
      to:["hello@voyafly.com", "edisonchanhonkeong@gmail.com", "edison.chan@fxchange.sg" , "han.zong@fxchange.sg" , "eric.yi@fxchange.sg"],
      subject: "QR Code",
      text: "YOUR STOCK DETAILS \n\nYou are left with " + stock + " stock",
    };
    await transporter.sendMail(mailOptions);
  } catch (error) {
    console.error("Error sending email:>>>>>>>>>>>>>>>", error);
  }
}
