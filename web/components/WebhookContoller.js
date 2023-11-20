import qrcode from "qrcode";
import fs from "fs";
import nodemailer from "nodemailer";
import sharp from "sharp";

export async function generateQRCodeWithLogo(
  ESIM_URLs,
  customermail,
  orderID,
  ESIM_ICCDIs,
  bundle_names
) {
  try {
    if (
      ESIM_URLs.length > 0 &&
      customermail &&
      orderID &&
      ESIM_ICCDIs.length > 0 &&
      bundle_names.length > 0
    ) {
      const qrCodeImagesWithLogo = [];
      const qrCodeOptions = {
        errorCorrectionLevel: "H",
        type: "image/png",
        quality: 1,
        margin: 2,
        width: 240,
        height: 240,
      };

      for (const currentESIM_URLPromise of ESIM_URLs) {
        // Resolve the promise to get the actual URL
        const currentESIM_URL = await currentESIM_URLPromise;
        const qrCodeBuffer = await qrcode.toBuffer(
          currentESIM_URL,
          qrCodeOptions
        );
        const companyLogoBuffer = fs.readFileSync("./logo.png");
        const qrCodeImageMetadata = await sharp(qrCodeBuffer).metadata();
        const logoWidth = qrCodeImageMetadata.width / 4;
        const logoHeight = qrCodeImageMetadata.height / 4;
        const logoPositionX = Math.floor(
          (qrCodeImageMetadata.width - logoWidth) / 2
        );
        const logoPositionY = Math.floor(
          (qrCodeImageMetadata.height - logoHeight) / 2
        );
        const qrCodeImageWithLogo = sharp(qrCodeBuffer);
        qrCodeImageWithLogo.composite([
          {
            input: await sharp(companyLogoBuffer)
              .resize(logoWidth, logoHeight)
              .toBuffer(),
            left: logoPositionX,
            top: logoPositionY,
          },
        ]);
        qrCodeImagesWithLogo.push(await qrCodeImageWithLogo.toBuffer());
      }
      await sendQRCodeToCustomerWithRetry(
        customermail,
        orderID,
        ESIM_ICCDIs,
        bundle_names,
        qrCodeImagesWithLogo
      );
    }
  } catch (error) {
    console.error("Error generating QR codes:", error);
  }
}

async function sendQRCodeToCustomerWithRetry(
  customermail,
  orderID,
  ESIM_ICCDIs,
  bundle_names,
  qrCodeImagesWithLogo,
  retryCount = 3
) {
  let attempt = 1;
  while (attempt <= retryCount) {
    try {
      await sendQRCodeEmail(
        customermail,
        orderID,
        ESIM_ICCDIs,
        bundle_names,
        qrCodeImagesWithLogo
      );
      console.log(`Email sent successfully on attempt ${attempt}`);
      return;
    } catch (error) {
      console.error(`Error sending email on attempt ${attempt}:`, error);
      attempt++;
      if (attempt <= retryCount) {
        await new Promise((resolve) => setTimeout(resolve, 5000));
      } else {
        throw error;
      }
    }
  }
}

async function sendQRCodeEmail(
  customermail,
  orderID,
  ESIM_ICCDIs,
  bundle_names,
  qrCodeImagesWithLogo
) {
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

    // Create an array to store attachments
    const attachments = [];

    // Attach QR code images to their corresponding bundle names
    qrCodeImagesWithLogo.forEach((image, index) => {
      attachments.push({
        filename: `qrcode${index + 1}.png`,
        content: image,
        cid: `qrcode${index + 1}@voyafly.com`,
        contentDisposition: `inline; filename="qrcode${index + 1}.png"; name="${
          bundle_names[index]
        }.png"`,
      });
    });

    //  bcc: 'hello@voyafly.com',
    const mailOptions = {
      from: "hello@voyafly.com",
      to: customermail,
      bcc: "hello@voyafly.com",
      subject: "[Voyafly] Your eSIM #" + orderID + " has Arrived ",
      html: generateEmailContent(
        orderID,
        ESIM_ICCDIs,
        bundle_names,
        attachments
      ),
      attachments: attachments,
    };

    await transporter.sendMail(mailOptions);
  } catch (error) {
    console.error("Error sending email:", error);
    throw error;
  }
}

function generateEmailContent(orderID, ESIM_ICCDIs, bundle_names, attachments) {
  let emailContent = `
    <p>Thank you for choosing Voyafly.</p>
    <p>Below is your order information and QR Codes for adding cellular data on your device:</p>
  `;

  for (let i = 0; i < bundle_names.length; i++) {
    emailContent += `
      <p>${bundle_names[i]}</p>
      <p>${orderID} - ${[i + 1]}</p>
      <p>ICCID: ${ESIM_ICCDIs[i]}</p>
      <img src="cid:qrcode${i + 1}@voyafly.com" alt="QR Code" /><br/><br/>
    `;
  }

  emailContent += `
    <br/>
    <p>How to Set up eSIM for iPhone</p>
    <h4>Scan a QR code (provided by the network operator)</h4>
    <ul>
      <li>Go to settings, then to Mobile/Cellular data, Add eSIM, Use QR code:</li>
      <li>Position the QR code from your carrier in the camera frame.</li>
      <li>Scan the QR code.</li>
      <li>When the Cellular Plan Detection notification appears, tap Continue.</li>
      <li>Tap Done.</li>
      <li>Tap Continue</li>
      <li>Select which line you want to use as the default line, tap Continue.</li>
      <li>Choose the cellular line you want to use as the primary line for iMessage, and tap Continue.</li>
      <li>Select the line you will use for cellular data.</li>
      <li>Tap Continue.</li>
      <li>You will see your eSIM ready to use in the settings.</li>
    </ul>
    <br/>
    <p>How to Set up eSIM for Android</p>
    <h4>Scan a QR code (provided by the network operator)</h4>
    <ul>
      <li>Go to Settings > Connections</li>
      <li>Tap on SIM card manager</li>
      <li>Select Add eSIM</li>
      <li>Navigate to Other ways to add plans</li>
      <li>Choose Add using QR code</li>
      <li>Scan the provided QR code</li>
      <li>Follow on-screen prompts</li>
    </ul>
    <br/>
    <p>Important things to know</p>
    <ul>
      <li>Make sure you have an eSIM compatible and network-unlocked device.</li>
      <li>Be connected to a WiFi to activate an eSIM successfully.</li>
      <li>Please ensure Data Roaming is turned on.</li>
      <li>Be noted that the validity begins once you connect to your destination network.</li>
      <li>Do not remove the eSIM while you're using it, since most eSIMs cannot be reinstalled or regenerated.</li>
      <li><a href="https://voyafly.com/pages/frequently-asked-questions">https://voyafly.com/pages/frequently-asked-questions</a>.</li>
    </ul>
    <div style="display: none;">
      <p>Attachments:</p>
  `;

  // Add attachment links
  attachments.forEach((attachment, index) => {
    emailContent += `
      <p>${index + 1}. <a href="cid:${attachment.cid}">${
      attachment.contentDisposition
    }</a></p>
    `;
  });

  // Close the attachments section div
  emailContent += `
    </div>
  `;

  return emailContent;
}
