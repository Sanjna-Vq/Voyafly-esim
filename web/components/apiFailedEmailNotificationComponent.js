import nodemailer from "nodemailer";

export async function sendApiFailedMailToClientWithRetry(orderID , apiName , error, retryCount = 5) {
  let attempt = 1;
  while (attempt <= retryCount) {
    try {
      await sendApiFailedMailToClient(orderID , apiName , error);
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

async function sendApiFailedMailToClient(orderID , apiName , error) {
  try {
    const uniqueErrors = Array.from(new Set(error));
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
      // to:"sanjna@vqcodes.com",
      to:["hello@voyafly.com", "edisonchanhonkeong@gmail.com", "edison.chan@fxchange.sg" , "han.zong@fxchange.sg" , "eric.yi@fxchange.sg"],
      subject: "ORDER MAIL NOT SENT TO CUSTOMER",
      text: `The mail for order id #${orderID} not sent due to the ${apiName} api failure.\nReason of the ${apiName} failure:\n${uniqueErrors.join(', ')}`,
    };
    await transporter.sendMail(mailOptions);
  } catch (error) {
    console.error("Error sending email:>>>>>>>>>>>>>>>", error);
  }
}
